# Proxmox Network Setup

Use the USB Ethernet adapter `enx001122683822` as the bridge port for `vmbr0` and assign the Proxmox management IP to the bridge.

## Config

```ini
auto lo
iface lo inet loopback

iface enx001122683822 inet manual

auto vmbr0
iface vmbr0 inet static
    address 10.100.0.100/24
    gateway 10.100.0.1
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

Open Proxmox at `https://10.100.0.100:8006`.

## Terraform API Permissions

The Terraform token must be allowed to clone the cloud-init template. If the token can authenticate but lacks clone ACLs, Terraform fails with `403 Permission check failed (/vms/9000, VM.Clone)`.

The template VM ID must also exist on the same node Terraform targets. If `PVE1_TEMPLATE_VM_ID=9000` but `pve-1` does not actually have template VM `9000`, Proxmox returns `unable to find configuration file for VM 9000 on node 'pve-1'`.

If the token can clone but cannot attach the NIC to `vmbr0`, Proxmox fails with `403 Permission check failed (/sdn/zones/localnetwork/vmbr0, SDN.Use)`.

Terraform also writes cloned disks onto the storage named by `PVE1_STORAGE` and `PVE2_STORAGE`. If those IDs do not exist on the target nodes, Proxmox returns `storage 'local-lvm' does not exist`.

Create a role with the required privileges on each Proxmox host:

```bash
pveum role add TerraformProv -privs "Datastore.AllocateSpace Datastore.Audit SDN.Use Sys.Audit VM.Allocate VM.Audit VM.Clone VM.Config.CDROM VM.Config.CPU VM.Config.Cloudinit VM.Config.Disk VM.Config.HWType VM.Config.Memory VM.Config.Network VM.Config.Options VM.PowerMgmt"
```

Create the service user and token:

```bash
pveum user add terraform@pve@pam
pveum aclmod / -user terraform@pve@pam -role TerraformProv
pveum user token add terraform@pve@pam codex -privsep 0
```

Grant the clone permission on the template path too. Repeat on any host that owns a template referenced by `PVE1_TEMPLATE_VM_ID` or `PVE2_TEMPLATE_VM_ID`:

```bash
pveum aclmod /vms/9000 -user terraform@pve@pam -role TerraformProv
```

Grant SDN bridge use on the network path too:

```bash
pveum aclmod /sdn/zones/localnetwork/vmbr0 -user terraform@pve@pam -role TerraformProv
```

Verify before re-running bootstrap:

```bash
pveum user permissions terraform@pve@pam
```

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
