# METADATA
# title: Restrict high-risk Docker Compose settings
# description: Detect Compose options that grant containers broad host access or disable kernel protections.
# custom:
#   id: PYWI-COMPOSE-001
#   severity: HIGH
#   input:
#     selector:
#       - type: yaml
package user.compose_security

deny[res] {
	service_name := object.keys(input.services)[_]
	service := input.services[service_name]
	service.privileged == true
	msg := sprintf("Compose service %q must not set privileged: true", [service_name])
	res := result.new(msg, service.privileged)
}

deny[res] {
	service_name := object.keys(input.services)[_]
	service := input.services[service_name]
	host_namespace(service)
	msg := sprintf("Compose service %q must not share a host namespace", [service_name])
	res := result.new(msg, service)
}

host_namespace(service) {
	lower(service.network_mode) == "host"
}

host_namespace(service) {
	lower(service.pid) == "host"
}

host_namespace(service) {
	lower(service.ipc) == "host"
}

deny[res] {
	service_name := object.keys(input.services)[_]
	service := input.services[service_name]
	capability := upper(service.cap_add[_])
	dangerous := {"SYS_ADMIN", "SYS_PTRACE", "NET_ADMIN", "DAC_READ_SEARCH", "SYS_MODULE", "SYS_RAWIO", "SYS_BOOT", "SYS_TIME", "MKNOD"}
	dangerous[capability]
	msg := sprintf("Compose service %q adds the high-risk capability %q", [service_name, capability])
	res := result.new(msg, service.cap_add)
}

deny[res] {
	service_name := object.keys(input.services)[_]
	service := input.services[service_name]
	service.devices[_]
	msg := sprintf("Compose service %q must not map host devices", [service_name])
	res := result.new(msg, service.devices)
}

deny[res] {
	service_name := object.keys(input.services)[_]
	service := input.services[service_name]
	option := lower(service.security_opt[_])
	contains(option, "unconfined")
	msg := sprintf("Compose service %q must not disable its security profile", [service_name])
	res := result.new(msg, service.security_opt)
}

deny[res] {
	service_name := object.keys(input.services)[_]
	service := input.services[service_name]
	option := lower(service.security_opt[_])
	option == "no-new-privileges:false"
	msg := sprintf("Compose service %q must not disable no-new-privileges", [service_name])
	res := result.new(msg, service.security_opt)
}

deny[res] {
	service_name := object.keys(input.services)[_]
	service := input.services[service_name]
	volume := service.volumes[_]
	sensitive_bind_mount(volume)
	msg := sprintf("Compose service %q must not mount sensitive host paths", [service_name])
	res := result.new(msg, volume)
}

sensitive_bind_mount(volume) {
	is_string(volume)
	parts := split(volume, ":")
	count(parts) > 1
	sensitive_host_path(parts[0])
}

sensitive_bind_mount(volume) {
	is_object(volume)
	volume.type == "bind"
	sensitive_host_path(volume.source)
}

sensitive_host_path(path) {
	path == "/"
}

sensitive_host_path(path) {
	regex.match("^/(etc|proc|sys|dev|run|var/run|var/lib/docker)(/|$)", path)
}
