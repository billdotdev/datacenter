terraform {
  required_version = ">= 1.6.0"

  required_providers {
    proxmox = {
      source  = "bpg/proxmox"
      version = "~> 0.77"
    }
  }
}

provider "proxmox" {
  alias     = "pve1"
  endpoint  = var.pve1_api_url
  api_token = "${var.pve1_api_token_id}=${var.pve1_api_token_secret}"
  insecure  = true
}

provider "proxmox" {
  alias     = "pve2"
  endpoint  = var.pve2_api_url
  api_token = "${var.pve2_api_token_id}=${var.pve2_api_token_secret}"
  insecure  = true
}
