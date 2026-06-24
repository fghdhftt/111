#!/bin/bash
# Скрипт установки WireGuard сервера на Ubuntu/Debian (Oracle Cloud Free Tier)
# Запускать на VPS: curl -sL https://raw.githubusercontent.com/ ваш-скрипт | bash
# Или сохранить и запустить: bash setup-server.sh

set -e

SERVER_PORT=${SERVER_PORT:-51820}
SERVER_IP=$(curl -s ifconfig.me || curl -s icanhazip.com)

echo "=== WireGuard сервер установка ==="
echo "IP сервера: $SERVER_IP"
echo "Порт: $SERVER_PORT"

# Установка WireGuard
apt-get update -qq
apt-get install -y -qq wireguard qrencode

# Генерация ключей сервера
wg genkey | tee /etc/wireguard/server.key | wg pubkey > /etc/wireguard/server.key.pub
chmod 600 /etc/wireguard/server.key

SERVER_PRIV=$(cat /etc/wireguard/server.key)
SERVER_PUB=$(cat /etc/wireguard/server.key.pub)

# Создание конфигурации сервера
cat > /etc/wireguard/wg0.conf <<EOF
[Interface]
PrivateKey = $SERVER_PRIV
Address = 10.0.0.1/24
ListenPort = $SERVER_PORT
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
EOF

# Включение форвардинга
sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf

# Генерация клиентского ключа
CLIENT_PRIV=$(wg genkey)
CLIENT_PUB=$(echo "$CLIENT_PRIV" | wg pubkey)

# Добавление клиента в конфиг сервера
cat >> /etc/wireguard/wg0.conf <<EOF

# Client
[Peer]
PublicKey = $CLIENT_PUB
AllowedIPs = 10.0.0.2/32
EOF

# Создание конфига клиента
CLIENT_CONF="/root/client-$(hostname).conf"
cat > "$CLIENT_CONF" <<EOF
# Name: $(hostname | tr '[:upper:]' '[:lower:]')
# Country: $(hostname | cut -d- -f1 | tr '[:upper:]' '[:lower:]')
[Interface]
PrivateKey = $CLIENT_PRIV
Address = 10.0.0.2/32
DNS = 1.1.1.1

[Peer]
PublicKey = $SERVER_PUB
Endpoint = $SERVER_IP:$SERVER_PORT
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
EOF

# Запуск WireGuard
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0

echo "================================"
echo "Сервер WireGuard запущен!"
echo "================================"
echo ""
echo "Клиентский конфиг сохранён: $CLIENT_CONF"
echo ""
echo "Скопируйте этот конфиг на ваш компьютер"
echo "и положите в папку configs/ приложения."
echo ""
echo "--- КОНФИГ КЛИЕНТА ---"
cat "$CLIENT_CONF"
echo "---"

# QR код для удобства
echo ""
echo "QR-код для импорта в WireGuard Mobile:"
qrencode -t ansiutf8 < "$CLIENT_CONF" 2>/dev/null || true
