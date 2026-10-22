provider "mongodbatlas" {}

resource "mongodbatlas_project" "pharmacy" {
  name   = var.project_name
  org_id = var.atlas_org_id
}

resource "mongodbatlas_cluster" "pharmacy" {
  project_id                   = mongodbatlas_project.pharmacy.id
  name                         = var.cluster_name
  cluster_type                 = "REPLICASET"
  mongo_db_major_version       = "7.0"
  provider_name                = "TENANT"
  backing_provider_name        = "AWS"
  provider_region_name         = var.aws_region
  provider_instance_size_name  = "M0"
  auto_scaling_disk_gb_enabled = false
}
