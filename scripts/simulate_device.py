#!/usr/bin/env python3
import argparse
import json
import os
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request


def post_json(url: str, body: dict, timeout: float = 30.0) -> tuple[int, str]:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, resp.read().decode("utf-8", errors="replace")


def get_url(url: str, timeout: float = 30.0) -> tuple[int, str]:
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, resp.read().decode("utf-8", errors="replace")


def device_loop(
    device_id: str,
    root: str,
    interval: int,
    poll: bool,
    task_type: str,
    stop: threading.Event,
) -> None:
    hb_url = f"{root}/api/v1/client/heartbeat"
    n = 0
    prefix = f"[{device_id}]"
    while not stop.is_set():
        n += 1
        try:
            code, text = post_json(hb_url, {"device_id": device_id})
            ts = time.strftime("%Y-%m-%d %H:%M:%S")
            print(f"{prefix} [{ts}] #{n} heartbeat HTTP {code} {text}", flush=True)
            if poll:
                q = f"{root}/api/v1/client/tasks/next?device_id={urllib.parse.quote(device_id)}"
                if task_type.strip():
                    q += f"&task_type={urllib.parse.quote(task_type.strip())}"
                c2, t2 = get_url(q)
                print(f"{prefix}            poll    HTTP {c2} {t2}", flush=True)
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace") if e.fp else ""
            print(f"{prefix} [err] HTTP {e.code} {body}", file=sys.stderr, flush=True)
        except urllib.error.URLError as e:
            print(f"{prefix} [err] {e.reason}", file=sys.stderr, flush=True)
        if stop.wait(timeout=max(1, interval)):
            break


def main() -> int:
    parser = argparse.ArgumentParser(description="模拟客户端设备在线（定时心跳，可多设备并行，方便测试）")
    parser.add_argument(
        "--base",
        default=os.getenv("AMZ_API_BASE", "http://127.0.0.1:5090"),
        help="服务根地址，不含 /api/v1，默认 AMZ_API_BASE 或 http://127.0.0.1:5090",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=10,
        help="同时模拟的设备数量，默认 10；设备 ID 为 PREFIX-001 … PREFIX-NNN。设为 1 时可配合 --device-id 指定单机 ID",
    )
    parser.add_argument(
        "--id-prefix",
        default=os.getenv("AMZ_DEVICE_PREFIX", "sim-device"),
        help="多设备时 ID 前缀，默认 sim-device（得到 sim-device-001 等）",
    )
    parser.add_argument(
        "--device-id",
        default=os.getenv("AMZ_DEVICE_ID", "sim-device-001"),
        help="仅当 --count 为 1 时有效，作为唯一设备 ID",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=60,
        help="每台设备心跳间隔（秒），默认 60",
    )
    parser.add_argument(
        "--poll",
        action="store_true",
        help="每次心跳后再请求 GET .../client/tasks/next",
    )
    parser.add_argument(
        "--task-type",
        default="",
        help="与 --poll 同用时可填 search_click / register 等",
    )
    args = parser.parse_args()
    root = args.base.rstrip("/")
    hb_url = f"{root}/api/v1/client/heartbeat"

    if args.count < 1:
        print("--count 至少为 1", file=sys.stderr)
        return 1

    if args.count == 1:
        print(f"heartbeat -> {hb_url}", file=sys.stderr)
        print(f"device_id={args.device_id!r} interval={args.interval}s poll={args.poll}", file=sys.stderr)
        did = args.device_id
        n = 0
        while True:
            n += 1
            try:
                code, text = post_json(hb_url, {"device_id": did})
                ts = time.strftime("%Y-%m-%d %H:%M:%S")
                print(f"[{ts}] #{n} heartbeat HTTP {code} {text}")
                if args.poll:
                    q = f"{root}/api/v1/client/tasks/next?device_id={urllib.parse.quote(did)}"
                    if args.task_type.strip():
                        q += f"&task_type={urllib.parse.quote(args.task_type.strip())}"
                    c2, t2 = get_url(q)
                    print(f"           poll    HTTP {c2} {t2}")
            except urllib.error.HTTPError as e:
                body = e.read().decode("utf-8", errors="replace") if e.fp else ""
                print(f"[err] HTTP {e.code} {body}", file=sys.stderr)
            except urllib.error.URLError as e:
                print(f"[err] {e.reason}", file=sys.stderr)
            except KeyboardInterrupt:
                print("\nbye", file=sys.stderr)
                return 0
            try:
                time.sleep(max(1, args.interval))
            except KeyboardInterrupt:
                print("\nbye", file=sys.stderr)
                return 0

    count = min(args.count, 500)
    if count != args.count:
        print(f"警告: --count 超过 500，已截断为 500", file=sys.stderr)
    ids = [f"{args.id_prefix}-{i:03d}" for i in range(1, count + 1)]
    print(f"heartbeat -> {hb_url}", file=sys.stderr)
    print(f"devices={count} {ids[0]} … {ids[-1]} interval={args.interval}s poll={args.poll}", file=sys.stderr)
    stop = threading.Event()
    threads: list[threading.Thread] = []
    for did in ids:
        t = threading.Thread(
            target=device_loop,
            args=(did, root, args.interval, args.poll, args.task_type, stop),
            name=did,
            daemon=True,
        )
        t.start()
        threads.append(t)
    try:
        while any(t.is_alive() for t in threads):
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\n正在停止所有模拟设备…", file=sys.stderr)
        stop.set()
        for t in threads:
            t.join(timeout=5.0)
        print("bye", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
