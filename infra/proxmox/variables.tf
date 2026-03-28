variable "pve1_api_url" {
  type = string
}

variable "pve1_api_token_id" {
  type = string
}

variable "pve1_api_token_secret" {
  type      = string
  sensitive = true
}

variable "pve1_node" {
  type = string
}

variable "pve1_storage" {
  type = string
}

variable "pve1_bridge" {
  type = string
}

variable "pve1_template_vm_id" {
  type = number
}

variable "pve2_api_url" {
  type = string
}

variable "pve2_api_token_id" {
  type = string
}

variable "pve2_api_token_secret" {
  type      = string
  sensitive = true
}

variable "pve2_node" {
  type = string
}

variable "pve2_storage" {
  type = string
}

variable "pve2_bridge" {
  type = string
}

variable "pve2_template_vm_id" {
  type = number
}

variable "ssh_public_key" {
  type = string
}

variable "control_plane_vms" {
  type = map(object({
    vm_id        = number
    ip           = string
    cores        = number
    memory       = number
    disk_gb      = number
    proxmox_host = string
  }))
}
