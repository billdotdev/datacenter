# Proxmox Network Setup

Use the USB Ethernet adapter `enx001122683822` as the bridge port for `vmbr0` and assign the Proxmox management IP to the bridge.

## Config

```ini
auto lo
iface lo inet loopback

iface enx001122683822 inet manual

auto vmbr0
iface vmbr0 inet static
    address 10.100.1.100/24
    gateway 10.100.1.1
    bridge-ports enx001122683822
    bridge-stp off
    bridge-fd 0
```

## Apply

```bash
ifreload -a
```

## Verify

```bash
ip addr show vmbr0
```

Open Proxmox at `https://10.100.1.100:8006`.

Replace any old `nic0` reference with `enx001122683822`, or the bridge will fail with `bridge port nic0 does not exist`.

## USB Ethernet Adapter

If the Realtek USB Ethernet adapter does not come back after reboot, add `usbcore.autosuspend=-1` to `/etc/kernel/cmdline` so Ethernet works after a reboot.

Example:

```text
root=ZFS=rpool/ROOT/pve-1 boot=zfs reboot=cold usbcore.autosuspend=-1
```

Apply the change and reboot:

```bash
proxmox-boot-tool refresh
reboot
```

Verify after boot:

```bash
cat /proc/cmdline
```

The output should include `usbcore.autosuspend=-1`.
