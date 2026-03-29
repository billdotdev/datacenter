locals {
  pve1_control_plane_vms = {
    for name, vm in var.control_plane_vms : name => vm if vm.proxmox_host == "pve1"
  }

  pve2_control_plane_vms = {
    for name, vm in var.control_plane_vms : name => vm if vm.proxmox_host == "pve2"
  }
}

resource "proxmox_virtual_environment_vm" "control_plane_pve1" {
  provider  = proxmox.pve1
  for_each  = local.pve1_control_plane_vms
  node_name = var.pve1_node
  vm_id     = each.value.vm_id
  name      = each.key

  clone {
    vm_id   = var.pve1_template_vm_id
    retries = 3
  }

  cpu {
    cores = each.value.cores
    type  = "x86-64-v2-AES"
  }

  memory {
    dedicated = each.value.memory
    floating  = each.value.memory_min
  }

  serial_device {
    device = "socket"
  }

  initialization {
    datastore_id = var.pve1_storage

    ip_config {
      ipv4 {
        address = "${each.value.ip}/24"
        gateway = "10.100.0.1"
      }
    }

    user_account {
      username = "ubuntu"
      keys     = [trimspace(var.ssh_public_key)]
    }
  }

  network_device {
    bridge = var.pve1_bridge
  }

  disk {
    datastore_id = var.pve1_storage
    interface    = "scsi0"
    size         = each.value.disk_gb
  }
}

resource "proxmox_virtual_environment_vm" "control_plane_pve2" {
  provider  = proxmox.pve2
  for_each  = local.pve2_control_plane_vms
  node_name = var.pve2_node
  vm_id     = each.value.vm_id
  name      = each.key

  clone {
    vm_id   = var.pve2_template_vm_id
    retries = 3
  }

  cpu {
    cores = each.value.cores
    type  = "x86-64-v2-AES"
  }

  memory {
    dedicated = each.value.memory
    floating  = each.value.memory_min
  }

  serial_device {
    device = "socket"
  }

  initialization {
    datastore_id = var.pve2_storage

    ip_config {
      ipv4 {
        address = "${each.value.ip}/24"
        gateway = "10.100.0.1"
      }
    }

    user_account {
      username = "ubuntu"
      keys     = [trimspace(var.ssh_public_key)]
    }
  }

  network_device {
    bridge = var.pve2_bridge
  }

  disk {
    datastore_id = var.pve2_storage
    interface    = "scsi0"
    size         = each.value.disk_gb
  }
}
