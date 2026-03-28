output "control_plane_ips" {
  value = {
    for name, vm in var.control_plane_vms : name => vm.ip
  }
}
