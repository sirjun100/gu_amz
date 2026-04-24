#!/usr/bin/env python3
"""
Captcha assist desktop tool with a main control panel.

Features:
1. Main UI with live logs.
2. Configurable API base URL (AMZ_API_BASE).
3. Start/Stop monitoring.
4. Ordered serial queue processing (one popup at a time).
5. On confirm/upload success, close popup and continue next queue item.
"""

from __future__ import annotations

import json
import os
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from io import BytesIO
from typing import Any

import tkinter as tk
from tkinter import messagebox, scrolledtext, ttk

try:
    from PIL import Image, ImageTk
except ImportError as exc:  # pragma: no cover
    raise SystemExit("Pillow is required: pip install Pillow") from exc


def _app_dir() -> str:
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


CONFIG_PATH = os.path.join(_app_dir(), "yzm_config.json")


def _default_api_base() -> str:
    return (os.environ.get("AMZ_API_BASE") or "http://127.0.0.1:5090/api/v1").rstrip("/")


def _load_config() -> dict[str, Any]:
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            obj = json.load(f)
            return obj if isinstance(obj, dict) else {}
    except Exception:
        return {}


def _save_config(api_base: str) -> None:
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump({"api_base": api_base}, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


def _req_json(
    method: str,
    path: str,
    *,
    api_base: str,
    data: bytes | None = None,
    form: dict[str, str] | None = None,
    json_body: dict[str, Any] | None = None,
) -> tuple[int, Any]:
    base = api_base.rstrip("/")
    url = f"{base}{path if path.startswith('/') else '/' + path}"
    headers: dict[str, str] = {}
    body = data
    if json_body is not None:
        body = json.dumps(json_body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if form is not None:
        body = urllib.parse.urlencode(form).encode("utf-8")
        headers["Content-Type"] = "application/x-www-form-urlencoded"

    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read()
            code = resp.getcode() or 200
    except urllib.error.HTTPError as e:
        raw = e.read()
        code = e.code
    except Exception as e:  # noqa: BLE001
        return 0, {"error": str(e)}

    if not raw:
        return code, None
    try:
        return code, json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
        return code, raw.decode("utf-8", errors="replace")


def _req_bytes(path: str, *, api_base: str) -> tuple[int, bytes]:
    base = api_base.rstrip("/")
    url = f"{base}{path if path.startswith('/') else '/' + path}"
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.getcode() or 200, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception:  # noqa: BLE001
        return 0, b""


class SessionWindow:
    MAX_VIEW_W = 520
    MAX_VIEW_H = 900

    def __init__(
        self,
        root: tk.Tk,
        *,
        session: dict[str, Any],
        image: Image.Image,
        on_submit: Any,
    ) -> None:
        self.root = root
        self.session = session
        self.session_id = int(session["id"])
        self.on_submit = on_submit
        self._orig_image = image.convert("RGBA")
        self._view_image: Image.Image | None = None
        self._photo: ImageTk.PhotoImage | None = None
        self._scale = (1.0, 1.0)
        self._img_xy = (0, 0, 1, 1)
        self.clicks: list[tuple[int, int]] = []
        self._submitting = False

        self.win = tk.Toplevel(root)
        self.win.title(f"Captcha Assist  #{self.session_id}")
        self.win.minsize(880, 700)
        self.win.protocol("WM_DELETE_WINDOW", self._on_close_request)
        self.win.attributes("-topmost", True)
        self.win.after(1200, lambda: self.win.attributes("-topmost", False))

        top = ttk.Frame(self.win, padding=8)
        top.pack(fill=tk.X)
        task_id = session.get("task_id")
        device_id = session.get("device_id") or ""
        ttk.Label(top, text=f"Session #{self.session_id}  Task {task_id}  {device_id}").pack(side=tk.LEFT)

        mid = ttk.Frame(self.win, padding=(8, 0, 8, 0))
        mid.pack(fill=tk.BOTH, expand=True)

        img_box = ttk.LabelFrame(mid, text="Click image to mark points", padding=4)
        img_box.pack(fill=tk.BOTH, expand=True)
        self.canvas = tk.Canvas(img_box, bg="#2a2a2a", highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)
        self.canvas.bind("<Button-1>", self._on_canvas_click)

        tools = ttk.Frame(self.win, padding=8)
        tools.pack(fill=tk.X)
        self.btn_clear = ttk.Button(tools, text="Clear", command=self._clear_clicks)
        self.btn_clear.pack(side=tk.LEFT, padx=2)
        self.btn_submit = ttk.Button(tools, text="Confirm & Upload", command=self._submit)
        self.btn_submit.pack(side=tk.LEFT, padx=2)

        self.txt_points = scrolledtext.ScrolledText(
            self.win,
            height=5,
            state=tk.DISABLED,
            font=("TkFixedFont", 10),
        )
        self.txt_points.pack(fill=tk.X, padx=8, pady=(0, 8))

        self.var_status = tk.StringVar(value="Ready")
        ttk.Label(self.win, textvariable=self.var_status, anchor=tk.W).pack(fill=tk.X, padx=8, pady=(0, 8))

        self.win.after(50, self._render_image)

    def _on_close_request(self) -> None:
        if self._submitting:
            return
        messagebox.showinfo("Hint", "Please use 'Confirm & Upload'.")

    def _render_image(self) -> None:
        ow, oh = self._orig_image.size
        self.canvas.update_idletasks()
        available_w = max(320, self.canvas.winfo_width() - 24)
        available_h = max(560, self.canvas.winfo_height() - 24)
        max_w = min(self.MAX_VIEW_W, available_w)
        max_h = min(self.MAX_VIEW_H, available_h)
        scale = min(max_w / ow, max_h / oh, 1.0)
        vw = max(1, int(ow * scale))
        vh = max(1, int(oh * scale))
        self._view_image = self._orig_image.resize((vw, vh), Image.Resampling.LANCZOS)
        self._photo = ImageTk.PhotoImage(self._view_image)
        self._scale = (ow / vw, oh / vh)

        self.canvas.delete("all")
        cw = max(self.canvas.winfo_width(), vw + 24)
        ch = max(self.canvas.winfo_height(), vh + 24)
        x0 = (cw - vw) // 2
        y0 = (ch - vh) // 2
        self._img_xy = (x0, y0, vw, vh)
        self.canvas.create_image(x0 + vw // 2, y0 + vh // 2, image=self._photo)
        self.var_status.set(f"Image: {ow}x{oh}  Points: {len(self.clicks)}")

    def _on_canvas_click(self, evt: tk.Event) -> None:  # type: ignore[name-defined]
        if self._submitting:
            return
        x0, y0, vw, vh = self._img_xy
        lx, ly = evt.x - x0, evt.y - y0
        if lx < 0 or ly < 0 or lx >= vw or ly >= vh:
            return
        sx, sy = self._scale
        ox = int(round(lx * sx))
        oy = int(round(ly * sy))
        self.clicks.append((ox, oy))

        cx = x0 + lx
        cy = y0 + ly
        r = 6
        self.canvas.create_line(cx - r, cy, cx + r, cy, fill="#ff4444", width=2)
        self.canvas.create_line(cx, cy - r, cx, cy + r, fill="#ff4444", width=2)
        self._refresh_points_text()

    def _refresh_points_text(self) -> None:
        self.txt_points.configure(state=tk.NORMAL)
        self.txt_points.delete("1.0", tk.END)
        for i, (x, y) in enumerate(self.clicks, 1):
            self.txt_points.insert(tk.END, f"{i}. ({x}, {y})\n")
        self.txt_points.configure(state=tk.DISABLED)
        self.var_status.set(f"Points: {len(self.clicks)}")

    def _clear_clicks(self) -> None:
        if self._submitting:
            return
        self.clicks = []
        self._refresh_points_text()
        self._render_image()

    def _submit(self) -> None:
        if self._submitting:
            return
        if not self.clicks:
            messagebox.showwarning("Submit", "Please click at least one point.")
            return
        self.set_submitting(True)
        self.on_submit(self, self.session_id, list(self.clicks))

    def set_submitting(self, value: bool) -> None:
        self._submitting = value
        if value:
            self.var_status.set("Uploading...")
            self.btn_submit.configure(state=tk.DISABLED)
            self.btn_clear.configure(state=tk.DISABLED)
        else:
            self.var_status.set("Upload failed, please retry.")
            self.btn_submit.configure(state=tk.NORMAL)
            self.btn_clear.configure(state=tk.NORMAL)

    def close(self) -> None:
        self.win.destroy()


class CaptchaAssistApp:
    IDLE_POLL_MS = 2000

    def __init__(self) -> None:
        self.root = tk.Tk()
        self.root.title("验证码辅助监控器")
        self.root.geometry("980x640")
        self.root.minsize(900, 580)

        cfg = _load_config()
        self.api_base = str(cfg.get("api_base") or _default_api_base()).strip().rstrip("/")
        self.is_running = False
        self._active_window: SessionWindow | None = None
        self._loading_next = False
        self._submit_in_flight = False
        self._idle_after_id: str | None = None

        self.var_api = tk.StringVar(value=self.api_base)
        self.var_state = tk.StringVar(value="未启动")
        self._build_ui()
        self.root.protocol("WM_DELETE_WINDOW", self._on_app_close)
        self.log("程序已启动，等待开始监控。")

    def _build_ui(self) -> None:
        top = ttk.Frame(self.root, padding=10)
        top.pack(fill=tk.X)

        ttk.Label(top, text="AMZ_API_BASE:").pack(side=tk.LEFT)
        self.ent_api = ttk.Entry(top, textvariable=self.var_api)
        self.ent_api.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(8, 8))

        self.btn_start = ttk.Button(top, text="开始监控", command=self.start_monitor)
        self.btn_start.pack(side=tk.LEFT, padx=(0, 6))
        self.btn_stop = ttk.Button(top, text="停止监控", command=self.stop_monitor, state=tk.DISABLED)
        self.btn_stop.pack(side=tk.LEFT)

        bar = ttk.Frame(self.root, padding=(10, 0, 10, 8))
        bar.pack(fill=tk.X)
        ttk.Label(bar, text="状态:").pack(side=tk.LEFT)
        ttk.Label(bar, textvariable=self.var_state).pack(side=tk.LEFT, padx=(6, 0))

        box = ttk.LabelFrame(self.root, text="实时日志", padding=8)
        box.pack(fill=tk.BOTH, expand=True, padx=10, pady=(0, 10))
        self.txt_log = scrolledtext.ScrolledText(box, state=tk.DISABLED, font=("Consolas", 10))
        self.txt_log.pack(fill=tk.BOTH, expand=True)

    def log(self, msg: str) -> None:
        ts = datetime.now().strftime("%H:%M:%S")
        line = f"[{ts}] {msg}\n"

        def write() -> None:
            self.txt_log.configure(state=tk.NORMAL)
            self.txt_log.insert(tk.END, line)
            self.txt_log.see(tk.END)
            self.txt_log.configure(state=tk.DISABLED)

        self.root.after(0, write)

    def _set_running_ui(self, running: bool) -> None:
        self.var_state.set("监控中" if running else "已停止")
        self.btn_start.configure(state=tk.DISABLED if running else tk.NORMAL)
        self.btn_stop.configure(state=tk.NORMAL if running else tk.DISABLED)
        self.ent_api.configure(state=tk.DISABLED if running else tk.NORMAL)

    def start_monitor(self) -> None:
        if self.is_running:
            return
        api = self.var_api.get().strip().rstrip("/")
        if not api:
            messagebox.showwarning("参数", "请填写 AMZ_API_BASE")
            return
        self.api_base = api
        _save_config(self.api_base)
        self.is_running = True
        self._set_running_ui(True)
        self.log(f"开始监控，API: {self.api_base}")
        self._load_next_session()
        self._schedule_idle_poll()

    def stop_monitor(self) -> None:
        if not self.is_running:
            return
        self.is_running = False
        if self._idle_after_id:
            try:
                self.root.after_cancel(self._idle_after_id)
            except Exception:
                pass
            self._idle_after_id = None
        self._set_running_ui(False)
        self.log("监控已停止。")

    def run(self) -> None:
        self.root.mainloop()

    def _on_app_close(self) -> None:
        api = self.var_api.get().strip().rstrip("/")
        if api:
            _save_config(api)
        self.stop_monitor()
        self.root.destroy()

    def _schedule_idle_poll(self) -> None:
        if not self.is_running:
            return
        if self._idle_after_id:
            self.root.after_cancel(self._idle_after_id)
        self._idle_after_id = self.root.after(self.IDLE_POLL_MS, self._idle_poll)

    def _idle_poll(self) -> None:
        self._idle_after_id = None
        if not self.is_running:
            return
        if self._active_window is None and not self._loading_next and not self._submit_in_flight:
            self._load_next_session()
        self._schedule_idle_poll()

    def _load_next_session(self) -> None:
        if not self.is_running:
            return
        if self._active_window is not None or self._loading_next:
            return
        self._loading_next = True

        def work() -> dict[str, Any]:
            status, body = _req_json("GET", "/admin/captcha-assist/pending", api_base=self.api_base)
            if status != 200:
                return {"ok": False, "error": f"Pending HTTP {status}: {body}"}
            items = body.get("items") if isinstance(body, dict) else None
            if not isinstance(items, list) or not items:
                return {"ok": True, "empty": True}

            def _sid(it: dict[str, Any]) -> int:
                try:
                    return int(it.get("id") or 0)
                except (TypeError, ValueError):
                    return 0

            item = sorted(items, key=_sid)[0]
            sid = int(item["id"])
            st, data = _req_bytes(f"/admin/captcha-assist/sessions/{sid}/image", api_base=self.api_base)
            if st != 200:
                return {"ok": False, "error": f"Image HTTP {st}"}
            return {"ok": True, "item": item, "image_bytes": data}

        def done(result: dict[str, Any]) -> None:
            self._loading_next = False
            if not self.is_running:
                return
            if not result.get("ok"):
                self.log(f"拉取队列失败: {result.get('error')}")
                self._schedule_idle_poll()
                return
            if result.get("empty"):
                self._schedule_idle_poll()
                return

            item = result["item"]
            sid = int(item.get("id") or 0)
            self.log(f"收到待处理队列: session_id={sid}")
            raw = result["image_bytes"]
            try:
                img = Image.open(BytesIO(raw)).convert("RGBA")
            except Exception as e:  # noqa: BLE001
                self.log(f"图片解码失败: {e}")
                self._schedule_idle_poll()
                return

            self._active_window = SessionWindow(
                self.root,
                session=item,
                image=img,
                on_submit=self._submit_current_session,
            )

        def runner() -> None:
            try:
                result = work()
            except Exception as e:  # noqa: BLE001
                result = {"ok": False, "error": str(e)}
            self.root.after(0, done, result)

        threading.Thread(target=runner, daemon=True).start()

    def _submit_current_session(
        self,
        window: SessionWindow,
        session_id: int,
        clicks: list[tuple[int, int]],
    ) -> None:
        if not self.is_running or self._submit_in_flight:
            return
        self._submit_in_flight = True
        payload = [{"x": x, "y": y} for x, y in clicks]
        self.log(f"提交点击坐标: session_id={session_id}, points={len(payload)}")

        def work() -> tuple[int, Any]:
            return _req_json(
                "POST",
                f"/admin/captcha-assist/sessions/{session_id}/submit",
                api_base=self.api_base,
                json_body={"clicks": payload},
            )

        def done(result: tuple[int, Any]) -> None:
            self._submit_in_flight = False
            code, body = result
            if code != 200:
                window.set_submitting(False)
                self.log(f"提交失败: session_id={session_id}, HTTP {code}, body={body}")
                messagebox.showerror("Submit failed", f"HTTP {code}\n{body}")
                return

            self.log(f"提交成功: session_id={session_id}")
            window.close()
            if self._active_window is window:
                self._active_window = None
            self._load_next_session()

        def runner() -> None:
            try:
                result = work()
            except Exception as e:  # noqa: BLE001
                result = (0, {"error": str(e)})
            self.root.after(0, done, result)

        threading.Thread(target=runner, daemon=True).start()


def main() -> None:
    CaptchaAssistApp().run()


if __name__ == "__main__":
    main()
