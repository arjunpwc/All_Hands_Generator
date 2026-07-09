terraform {
  required_version = ">= 1.5.0"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
  }
}

provider "oci" {
  region = var.region
}

variable "region" {
  type        = string
  description = "OCI region, e.g. us-ashburn-1"
}

variable "compartment_id" {
  type        = string
  description = "OCID of the compartment for resources"
}

variable "container_image" {
  type        = string
  description = "Full OCIR image URL"
}

variable "app_display_name" {
  type    = string
  default = "allhands-web"
}

variable "availability_domain" {
  type        = string
  description = "Availability domain for container instance"
}

resource "oci_core_vcn" "allhands_vcn" {
  compartment_id = var.compartment_id
  cidr_blocks    = ["10.0.0.0/16"]
  display_name   = "${var.app_display_name}-vcn"
}

resource "oci_core_internet_gateway" "allhands_igw" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.allhands_vcn.id
  display_name   = "${var.app_display_name}-igw"
  enabled        = true
}

resource "oci_core_route_table" "allhands_rt" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.allhands_vcn.id
  display_name   = "${var.app_display_name}-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.allhands_igw.id
  }
}

resource "oci_core_security_list" "allhands_sl" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.allhands_vcn.id
  display_name   = "${var.app_display_name}-sl"

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      min = 8000
      max = 8000
    }
  }

  egress_security_rules {
    protocol    = "all"
    destination = "0.0.0.0/0"
  }
}

resource "oci_core_subnet" "allhands_subnet" {
  compartment_id    = var.compartment_id
  vcn_id            = oci_core_vcn.allhands_vcn.id
  cidr_block        = "10.0.1.0/24"
  display_name      = "${var.app_display_name}-subnet"
  route_table_id    = oci_core_route_table.allhands_rt.id
  security_list_ids = [oci_core_security_list.allhands_sl.id]
}

resource "oci_objectstorage_bucket" "allhands_assets" {
  compartment_id = var.compartment_id
  namespace      = data.oci_objectstorage_namespace.ns.namespace
  name           = "${var.app_display_name}-assets"
  access_type    = "NoPublicAccess"
}

data "oci_objectstorage_namespace" "ns" {
  compartment_id = var.compartment_id
}

resource "oci_container_instances_container_instance" "allhands" {
  availability_domain = var.availability_domain
  compartment_id      = var.compartment_id
  display_name        = var.app_display_name

  container_count             = 1
  shape                       = "CI.Standard.E4.Flex"
  shape_config {
    ocpus         = 1
    memory_in_gbs = 2
  }

  vnics {
    subnet_id = oci_core_subnet.allhands_subnet.id
  }

  containers {
    display_name   = var.app_display_name
    image_url      = var.container_image
    container_port = 8000

    environment_variables {
      name  = "DATA_DIR"
      value = "/app/data"
    }

    environment_variables {
      name  = "CORS_ORIGINS"
      value = "*"
    }
  }
}

output "container_instance_id" {
  value = oci_container_instances_container_instance.allhands.id
}

output "assets_bucket" {
  value = oci_objectstorage_bucket.allhands_assets.name
}
