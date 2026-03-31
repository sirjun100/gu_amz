#!/bin/bash


sudo cp -f /root/pro/amz/etc/systemd/system/tgapi.service /etc/systemd/system/tgapi.service


echo "   启动-amz.service"
sudo systemctl enable amz.service
sudo systemctl start amz.service
sudo systemctl status amz.service --no-pager



