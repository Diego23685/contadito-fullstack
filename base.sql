-- MySQL dump 10.13  Distrib 8.0.36, for Win64 (x86_64)
--
-- Host: localhost    Database: contadito
-- ------------------------------------------------------
-- Server version	8.0.36

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `__efmigrationshistory`
--

DROP TABLE IF EXISTS `__efmigrationshistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `__efmigrationshistory` (
  `MigrationId` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ProductVersion` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`MigrationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `__efmigrationshistory`
--

LOCK TABLES `__efmigrationshistory` WRITE;
/*!40000 ALTER TABLE `__efmigrationshistory` DISABLE KEYS */;
INSERT INTO `__efmigrationshistory` VALUES ('20250918005538_AddPurchases','8.0.6');
/*!40000 ALTER TABLE `__efmigrationshistory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `api_keys`
--

DROP TABLE IF EXISTS `api_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_keys` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `token_hash` char(64) COLLATE utf8mb4_general_ci NOT NULL,
  `scopes` json DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_api_keys_tenant_name` (`tenant_id`,`name`),
  KEY `fk_api_keys_user` (`created_by`),
  CONSTRAINT `fk_api_keys_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_api_keys_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `api_keys`
--

LOCK TABLES `api_keys` WRITE;
/*!40000 ALTER TABLE `api_keys` DISABLE KEYS */;
/*!40000 ALTER TABLE `api_keys` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `parent_id` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_tenant_name` (`tenant_id`,`name`),
  KEY `idx_categories_tenant_parent` (`tenant_id`,`parent_id`),
  KEY `fk_categories_parent` (`parent_id`),
  CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_categories_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,1,'General',NULL,'2025-09-14 04:42:29','2025-09-14 04:42:29',NULL);
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(160) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(160) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `DocumentId` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` varchar(240) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `UpdatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `DeletedAt` datetime(6) DEFAULT NULL,
  `TenantId` bigint unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_customers_tenant_email` (`email`),
  KEY `idx_customers_tenant_name` (`name`),
  KEY `IX_Customers_TenantId_Name` (`TenantId`,`name`),
  CONSTRAINT `FK_Customers_Tenants_TenantId` FOREIGN KEY (`TenantId`) REFERENCES `tenants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'asdasdasd','asd@g.com','1234356','wdfwef','wer','2025-09-17 04:11:51.609213','2025-09-17 23:18:06.311533',NULL,5),(2,'Juan Lacayo','juanitolacayito@gmail.com','samsung','nose',NULL,'2025-09-18 01:27:31.928143','2025-09-18 01:27:31.928143',NULL,5),(3,'Maria Francisca','maria@cliente.com','12312312','001-261004-1030M','Barrio 3 420','2025-09-19 05:34:08.433877','2025-09-19 05:34:08.433877',NULL,5),(4,'mario',NULL,NULL,NULL,NULL,'2025-09-19 05:35:47.912297','2025-09-18 23:39:33.521037','2025-09-19 05:39:33.520065',5);
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `discounts`
--

DROP TABLE IF EXISTS `discounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `discounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `type` enum('percent','amount') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'percent',
  `value` decimal(18,6) NOT NULL DEFAULT '0.000000',
  `active_from` datetime DEFAULT NULL,
  `active_to` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_discounts_tenant_name` (`tenant_id`,`name`),
  CONSTRAINT `fk_discounts_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `discounts`
--

LOCK TABLES `discounts` WRITE;
/*!40000 ALTER TABLE `discounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `discounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_movements`
--

DROP TABLE IF EXISTS `inventory_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_movements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `warehouse_id` bigint unsigned DEFAULT NULL,
  `movement_type` enum('in','out','adjust') COLLATE utf8mb4_general_ci NOT NULL,
  `reference` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `quantity` decimal(18,6) NOT NULL,
  `unit_cost` decimal(18,6) DEFAULT NULL,
  `reason` varchar(160) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `moved_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_inv_mov_tenant_product` (`tenant_id`,`product_id`,`moved_at`),
  KEY `idx_inv_mov_tenant_wh` (`tenant_id`,`warehouse_id`),
  KEY `fk_inv_mov_product` (`product_id`),
  KEY `fk_inv_mov_warehouse` (`warehouse_id`),
  KEY `fk_inv_mov_user` (`created_by`),
  CONSTRAINT `fk_inv_mov_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inv_mov_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inv_mov_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_inv_mov_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_movements`
--

LOCK TABLES `inventory_movements` WRITE;
/*!40000 ALTER TABLE `inventory_movements` DISABLE KEYS */;
INSERT INTO `inventory_movements` VALUES (1,1,1,1,'in','SEED',100.000000,10.000000,'Stock inicial','2025-09-14 04:42:29',NULL,'2025-09-14 04:42:29'),(2,5,27,NULL,'in','C-20250918010252-901',2.000000,10.000000,'Compra (backfill)','2025-09-18 01:02:52',NULL,'2025-09-19 04:56:42'),(3,5,27,NULL,'in','C-20250918024638-522',43.000000,10.000000,'Compra (backfill)','2025-09-18 02:46:39',NULL,'2025-09-19 04:56:42'),(5,5,27,NULL,'out','F-20250918000905-682',2.000000,NULL,'Venta (backfill)','2025-09-18 00:09:05',NULL,'2025-09-19 04:56:42'),(6,5,27,NULL,'out','F-20250918024441-383',1.000000,NULL,'Venta (backfill)','2025-09-18 02:44:42',NULL,'2025-09-19 04:56:42'),(7,5,34,NULL,'out','F-20250918024441-383',2.000000,NULL,'Venta (backfill)','2025-09-18 02:44:42',NULL,'2025-09-19 04:56:42'),(8,5,34,NULL,'in','AJUSTE-APP',100.000000,NULL,'Ajuste manual','2025-09-19 05:13:59',NULL,'2025-09-19 05:13:59'),(9,5,35,NULL,'in','AJUSTE-APP',10.000000,NULL,'Ajuste manual','2025-09-19 05:14:18',NULL,'2025-09-19 05:14:18'),(10,5,39,NULL,'in','AJUSTE-APP',10.000000,NULL,'Ajuste manual','2025-09-21 05:09:40',NULL,'2025-09-21 05:09:40'),(11,5,40,NULL,'in','AJUSTE-APP',100.000000,NULL,'Ajuste manual','2025-09-21 05:30:40',NULL,'2025-09-21 05:30:40');
/*!40000 ALTER TABLE `inventory_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `invoice_id` bigint unsigned NOT NULL,
  `method` enum('cash','card','transfer','wallet') COLLATE utf8mb4_general_ci NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `paid_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reference` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_payments_tenant` (`tenant_id`),
  KEY `fk_payments_invoice` (`invoice_id`),
  CONSTRAINT `fk_payments_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_costs`
--

DROP TABLE IF EXISTS `product_costs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_costs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `cost_type` enum('material','mano_obra','overhead','transporte','otro') COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(160) COLLATE utf8mb4_general_ci NOT NULL,
  `qty` decimal(18,6) NOT NULL DEFAULT '1.000000',
  `unit_cost` decimal(18,6) NOT NULL DEFAULT '0.000000',
  `currency` char(3) COLLATE utf8mb4_general_ci DEFAULT 'NIO',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_product_costs_tenant_prod` (`tenant_id`,`product_id`),
  KEY `fk_product_costs_product` (`product_id`),
  CONSTRAINT `fk_product_costs_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_costs_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_costs`
--

LOCK TABLES `product_costs` WRITE;
/*!40000 ALTER TABLE `product_costs` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_costs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_images`
--

DROP TABLE IF EXISTS `product_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_images` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `url` varchar(512) NOT NULL,
  `sort_order` int DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `tenant_id` (`tenant_id`,`product_id`),
  CONSTRAINT `product_images_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_images_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_images`
--

LOCK TABLES `product_images` WRITE;
/*!40000 ALTER TABLE `product_images` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `sku` varchar(64) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(160) COLLATE utf8mb4_general_ci NOT NULL,
  `public_slug` varchar(160) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `public_description` text COLLATE utf8mb4_general_ci,
  `list_price` decimal(18,2) NOT NULL DEFAULT '0.00',
  `public_price` decimal(18,2) DEFAULT NULL,
  `std_cost` decimal(18,6) DEFAULT NULL,
  `unit` varchar(24) COLLATE utf8mb4_general_ci DEFAULT 'unidad',
  `barcode` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_service` tinyint(1) NOT NULL DEFAULT '0',
  `track_stock` tinyint(1) NOT NULL DEFAULT '1',
  `is_public` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `images_json` longtext COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_tenant_sku` (`tenant_id`,`sku`),
  UNIQUE KEY `ux_products_tenant_sku` (`tenant_id`,`sku`),
  KEY `idx_products_tenant_name` (`tenant_id`,`name`),
  KEY `fk_products_category` (`category_id`),
  KEY `idx_products_public` (`tenant_id`,`is_public`,`name`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_products_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,5,'SKU-001','Producto Demo','producto-demo',1,NULL,NULL,0.00,0.00,NULL,'unidad',NULL,0,1,1,'2025-09-14 04:42:29','2025-09-20 19:06:44',NULL,NULL),(12,1,'SKU-000','Camiseta Basica',NULL,NULL,'Camiseta 100% algodon',NULL,0.00,NULL,NULL,'unidad',NULL,0,1,1,'2025-09-15 22:49:05','2025-09-20 23:23:23',NULL,NULL),(13,1,'SKU-002','Pantalon Denim',NULL,NULL,'Denim azul clasico',NULL,0.00,NULL,NULL,'unidad',NULL,0,1,1,'2025-09-15 22:49:05','2025-09-20 23:23:23',NULL,NULL),(14,1,'SKU-003','Zapatos Urbanos',NULL,NULL,'Calzado urbano liviano',NULL,0.00,NULL,NULL,'par',NULL,0,1,1,'2025-09-15 22:49:05','2025-09-20 23:23:23',NULL,NULL),(15,1,'SKU-004','Gorra Clasica',NULL,NULL,'Gorra ajustable',NULL,0.00,NULL,NULL,'unidad',NULL,0,1,1,'2025-09-15 22:49:05','2025-09-20 23:23:23',NULL,NULL),(16,1,'SKU-005','Mochila Daypack',NULL,NULL,'Mochila diaria 20L',NULL,0.00,NULL,NULL,'unidad',NULL,0,1,1,'2025-09-15 22:49:05','2025-09-20 23:23:23',NULL,NULL),(17,1,'SKU-006','Cinturon Cuero',NULL,NULL,'Cinturon cuero genuino',NULL,0.00,NULL,NULL,'unidad',NULL,0,1,1,'2025-09-15 22:49:05','2025-09-20 23:23:23',NULL,NULL),(18,1,'SKU-007','Calcetines Deportivos',NULL,NULL,'Pack x3',NULL,0.00,NULL,NULL,'pack',NULL,0,1,1,'2025-09-15 22:49:05','2025-09-20 23:23:23',NULL,NULL),(19,1,'SKU-008','Camisa Formal',NULL,NULL,'Camisa manga larga',NULL,0.00,NULL,NULL,'unidad',NULL,0,1,1,'2025-09-15 22:49:05','2025-09-20 23:23:23',NULL,NULL),(20,1,'SKU-009','Sudadera Hoodie',NULL,NULL,'Hoodie con capucha',NULL,0.00,NULL,NULL,'unidad',NULL,0,1,1,'2025-09-15 22:49:05','2025-09-20 23:23:23',NULL,NULL),(21,1,'SKU-010','Servicio de Bordado',NULL,NULL,'Personalizacion de prendas',NULL,0.00,NULL,NULL,'servicio',NULL,1,0,1,'2025-09-15 22:49:05','2025-09-20 23:23:23',NULL,NULL),(22,5,'SKU-020','Camiseta Basica',NULL,NULL,'Camiseta 100% algodon',NULL,0.00,NULL,NULL,'unidad',NULL,0,1,1,'2025-09-15 22:54:56','2025-09-20 23:23:23','2025-09-18 02:15:54',NULL),(23,5,'SKU-002','Pantalon Denim','pantalon-denim',NULL,'Denim azul clasico','Denim azul clasico',0.00,0.00,NULL,'unidad',NULL,0,1,1,'2025-09-15 22:54:56','2025-09-20 19:06:44',NULL,NULL),(24,5,'SKU-003','Zapatos Urbanos','zapatos-urbanos',NULL,'Calzado urbano liviano','Calzado urbano liviano',0.00,0.00,NULL,'par',NULL,0,1,1,'2025-09-15 22:54:56','2025-09-20 19:06:44',NULL,NULL),(25,5,'SKU-004','Gorra Clasica','gorra-clasica',NULL,'Gorra ajustable','Gorra ajustable',0.00,0.00,NULL,'unidad',NULL,0,1,1,'2025-09-15 22:54:56','2025-09-20 19:06:44',NULL,NULL),(26,5,'SKU-005','Mochila Daypack','mochila-daypack',NULL,'Mochila diaria 20L','Mochila diaria 20L',0.00,0.00,NULL,'unidad',NULL,0,1,1,'2025-09-15 22:54:56','2025-09-20 19:06:44',NULL,NULL),(27,5,'SKU-006','Cinturon Cuero','cinturon-cuero',NULL,'Cinturon cuero genuino','Cinturon cuero genuino',20.00,20.00,10.000000,'unidad',NULL,0,1,1,'2025-09-15 22:54:56','2025-09-20 19:06:44',NULL,NULL),(28,5,'SKU-007','Calcetines Deportivos',NULL,NULL,'Pack x3',NULL,0.00,NULL,NULL,'pack',NULL,0,1,1,'2025-09-15 22:54:56','2025-09-20 23:23:23','2025-09-16 06:11:34',NULL),(29,5,'SKU-008','Camisa Formal',NULL,NULL,'Camisa manga larga',NULL,0.00,NULL,NULL,'unidad',NULL,0,1,1,'2025-09-15 22:54:56','2025-09-20 23:23:23','2025-09-16 06:11:24',NULL),(30,5,'SKU-009','Sudadera Hoodie',NULL,NULL,'Hoodie con capucha',NULL,0.00,NULL,NULL,'unidad',NULL,0,1,1,'2025-09-15 22:54:56','2025-09-20 23:23:23','2025-09-16 06:11:21',NULL),(31,5,'SKU-010','Servicio de Bordados',NULL,NULL,'Personalizacion de prendasiones',NULL,0.00,NULL,NULL,'servicio',NULL,1,0,1,'2025-09-15 22:54:56','2025-09-20 23:23:23','2025-09-16 06:11:09',NULL),(32,6,'1','CAMISA',NULL,NULL,'',NULL,0.00,NULL,NULL,'1',NULL,0,1,1,'2025-09-16 06:17:02','2025-09-20 23:23:23',NULL,NULL),(34,5,'CACA-002','Excremento','excremento',NULL,'','',100.00,100.00,20.000000,'plasta completa',NULL,0,1,1,'2025-09-18 01:56:45','2025-09-21 04:23:55',NULL,'[\"https://www.shutterstock.com/image-vector/crap-3d-cartoon-style-on-600nw-2402343107.jpg\"]'),(35,5,'CACA-004','Excremento number 2 type B','excremento-number-2-type-b',NULL,'El excremento mas nalgon que veras en tu vida','El excremento mas nalgon que veras en tu vida',20.00,20.00,10.000000,'unidad',NULL,0,1,1,'2025-09-18 02:48:00','2025-09-20 19:06:44',NULL,NULL),(36,5,'SKU-100','Camisa Básica','camisa-basica',NULL,NULL,NULL,350.00,350.00,120.000000,'unidad',NULL,0,1,1,'2025-09-20 19:06:44','2025-09-20 19:06:44',NULL,NULL),(37,5,'SKU-200','Pantalón Denim','pantalon-denim',NULL,NULL,NULL,790.00,790.00,300.000000,'unidad',NULL,0,1,1,'2025-09-20 19:06:44','2025-09-20 19:06:44',NULL,NULL),(38,5,'SKU-300','Gorra Logo','gorra-logo',NULL,NULL,NULL,199.00,199.00,60.000000,'unidad',NULL,0,1,1,'2025-09-20 19:06:44','2025-09-21 03:14:36',NULL,NULL),(39,5,'CACA-005','Mierda Mierdez','merda-merdez',NULL,'El mejor culo que vas a probar','desc',1.00,NULL,NULL,'prostituta',NULL,0,1,1,'2025-09-21 05:08:29','2025-09-20 23:18:13',NULL,'[\"http://127.0.0.1:5000/uploads/5/2025/09/31fa8250017b4ab68247616b48538530.jpg\"]'),(40,5,'CAFE-007','Agente 00','agente-00',NULL,'asd','asd',11.00,11.00,NULL,'unidad',NULL,0,1,1,'2025-09-21 05:30:02','2025-09-21 05:30:42',NULL,'[]');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_invoices`
--

DROP TABLE IF EXISTS `purchase_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_invoices` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `number` varchar(40) DEFAULT NULL,
  `supplier_name` varchar(160) DEFAULT NULL,
  `status` varchar(16) NOT NULL,
  `subtotal` decimal(18,2) NOT NULL,
  `tax_total` decimal(18,2) NOT NULL,
  `discount_total` decimal(18,2) NOT NULL,
  `total` decimal(18,2) NOT NULL,
  `currency` varchar(8) NOT NULL,
  `received_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IX_purchase_invoices_tenant_id` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_invoices`
--

LOCK TABLES `purchase_invoices` WRITE;
/*!40000 ALTER TABLE `purchase_invoices` DISABLE KEYS */;
INSERT INTO `purchase_invoices` VALUES (1,5,'C-20250918010252-901',NULL,'received',20.00,0.00,0.00,20.00,'NIO','2025-09-18 01:02:52.450144','2025-09-18 01:02:52.450166','2025-09-18 01:02:52.450185',NULL),(2,5,'C-20250918024638-522','Papulandio','received',430.00,19.35,43.00,406.35,'NIO','2025-09-18 02:46:38.929033','2025-09-18 02:46:38.929034','2025-09-18 02:46:38.929034',NULL),(3,5,'C-20250921031435-346',NULL,'received',120.00,0.00,0.00,120.00,'NIO','2025-09-21 03:14:35.502151','2025-09-21 03:14:35.502172','2025-09-21 03:14:35.502191',NULL);
/*!40000 ALTER TABLE `purchase_invoices` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_after_purchase_invoice_insert` AFTER INSERT ON `purchase_invoices` FOR EACH ROW BEGIN
  IF NEW.status = 'received' THEN
    INSERT INTO inventory_movements
      (tenant_id, product_id, warehouse_id, movement_type, reference, quantity, unit_cost, reason, moved_at)
    SELECT
      pi.tenant_id,
      pi.product_id,
      pi.warehouse_id,
      'in',
      NEW.number,
      pi.quantity,
      pi.unit_cost,
      'Compra',
      NOW()
    FROM purchase_items pi
    WHERE pi.invoice_id = NEW.id;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_after_purchase_invoice_update` AFTER UPDATE ON `purchase_invoices` FOR EACH ROW BEGIN
  IF NEW.status = 'received' AND OLD.status <> 'received' THEN
    INSERT INTO inventory_movements
      (tenant_id, product_id, warehouse_id, movement_type, reference, quantity, unit_cost, reason, moved_at)
    SELECT
      pi.tenant_id,
      pi.product_id,
      pi.warehouse_id,     -- si no usas almacenes aquí, quedará NULL
      'in',
      NEW.number,
      pi.quantity,
      pi.unit_cost,
      'Compra',
      NOW()
    FROM purchase_items pi
    WHERE pi.invoice_id = NEW.id;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `purchase_items`
--

DROP TABLE IF EXISTS `purchase_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `invoice_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `description` varchar(160) DEFAULT NULL,
  `quantity` decimal(18,6) NOT NULL,
  `unit_cost` decimal(18,6) NOT NULL,
  `warehouse_id` bigint DEFAULT NULL,
  `tax_rate` decimal(5,2) NOT NULL,
  `discount_rate` decimal(5,2) NOT NULL,
  `total` decimal(18,2) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `IX_purchase_items_invoice_id` (`invoice_id`),
  KEY `IX_purchase_items_tenant_id` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_items`
--

LOCK TABLES `purchase_items` WRITE;
/*!40000 ALTER TABLE `purchase_items` DISABLE KEYS */;
INSERT INTO `purchase_items` VALUES (1,5,1,27,'Cinturon Cuero',2.000000,10.000000,NULL,0.00,0.00,20.00,'2025-09-18 01:02:52.449626'),(2,5,2,27,'Cinturon Cuero',43.000000,10.000000,NULL,5.00,10.00,406.35,'2025-09-18 02:46:38.928993'),(3,5,3,38,'Gorra Logo',2.000000,60.000000,NULL,0.00,0.00,120.00,'2025-09-21 03:14:35.501641');
/*!40000 ALTER TABLE `purchase_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `supplier_id` bigint unsigned NOT NULL,
  `number` varchar(64) COLLATE utf8mb4_general_ci NOT NULL,
  `status` enum('draft','ordered','received','cancelled') COLLATE utf8mb4_general_ci DEFAULT 'draft',
  `subtotal` decimal(18,2) NOT NULL DEFAULT '0.00',
  `tax_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `currency` char(3) COLLATE utf8mb4_general_ci DEFAULT 'NIO',
  `ordered_at` datetime DEFAULT NULL,
  `received_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_po_tenant_number` (`tenant_id`,`number`),
  KEY `idx_purchase_orders_tenant_status` (`tenant_id`,`status`),
  KEY `fk_po_supplier` (`supplier_id`),
  CONSTRAINT `fk_po_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_po_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_invoices`
--

DROP TABLE IF EXISTS `sales_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_invoices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `number` varchar(64) COLLATE utf8mb4_general_ci NOT NULL,
  `status` enum('draft','issued','paid','cancelled') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'draft',
  `subtotal` decimal(18,2) NOT NULL DEFAULT '0.00',
  `tax_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `discount_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `currency` char(3) COLLATE utf8mb4_general_ci DEFAULT 'NIO',
  `issued_at` datetime DEFAULT NULL,
  `due_at` datetime DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sales_invoice_tenant_number` (`tenant_id`,`number`),
  KEY `idx_sales_invoices_tenant_status` (`tenant_id`,`status`),
  KEY `fk_sales_invoices_customer` (`customer_id`),
  KEY `fk_sales_invoices_user` (`created_by`),
  CONSTRAINT `fk_sales_invoices_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sales_invoices_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sales_invoices_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_invoices`
--

LOCK TABLES `sales_invoices` WRITE;
/*!40000 ALTER TABLE `sales_invoices` DISABLE KEYS */;
INSERT INTO `sales_invoices` VALUES (1,5,1,'F-20250918000905-682','issued',40.00,0.00,0.00,40.00,'NIO','2025-09-18 00:09:05',NULL,NULL,'2025-09-18 00:09:05','2025-09-18 00:09:05',NULL),(2,5,2,'F-20250918024441-383','issued',220.00,0.00,0.00,220.00,'NIO','2025-09-18 02:44:42',NULL,NULL,'2025-09-18 02:44:42','2025-09-18 02:44:42',NULL),(3,5,3,'CX-20250919060249','issued',100.00,0.00,0.00,100.00,NULL,'2025-09-19 06:02:49','2025-10-04 06:02:49',NULL,'2025-09-19 06:02:49','2025-09-19 06:02:49',NULL),(4,5,1,'F-20250921035113-920','issued',4740.00,0.00,0.00,4740.00,'NIO','2025-09-21 03:51:14',NULL,NULL,'2025-09-21 03:51:14','2025-09-21 03:51:14',NULL);
/*!40000 ALTER TABLE `sales_invoices` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_after_sales_invoice_insert` AFTER INSERT ON `sales_invoices` FOR EACH ROW BEGIN
  IF NEW.status IN ('issued','paid') THEN
    INSERT INTO inventory_movements
      (tenant_id, product_id, warehouse_id, movement_type, reference, quantity, unit_cost, reason, moved_at, created_by)
    SELECT
      si.tenant_id,
      it.product_id,
      NULL,               -- si manejas almacén por venta, cámbialo aquí
      'out',
      NEW.number,
      it.quantity,
      NULL,               -- costo unitario opcional para OUT
      'Venta',
      NOW(),
      NEW.created_by
    FROM sales_items it
    JOIN sales_invoices si ON si.id = it.invoice_id
    WHERE it.invoice_id = NEW.id;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
ALTER DATABASE `contadito` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_after_invoice_update` AFTER UPDATE ON `sales_invoices` FOR EACH ROW BEGIN
  IF NEW.status IN ('issued','paid') AND OLD.status NOT IN ('issued','paid') THEN
    INSERT INTO inventory_movements
      (tenant_id, product_id, warehouse_id, movement_type, reference, quantity, unit_cost, reason, moved_at, created_by)
    SELECT
      si.tenant_id, it.product_id, NULL, 'out', NEW.number, it.quantity, NULL, 'Venta', NOW(), NEW.created_by
    FROM sales_items it
    JOIN sales_invoices si ON si.id = it.invoice_id
    WHERE it.invoice_id = NEW.id;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
ALTER DATABASE `contadito` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci ;

--
-- Table structure for table `sales_items`
--

DROP TABLE IF EXISTS `sales_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `invoice_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `description` varchar(240) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `quantity` decimal(18,6) NOT NULL,
  `unit_price` decimal(18,6) NOT NULL,
  `tax_rate` decimal(5,2) DEFAULT '0.00',
  `discount_rate` decimal(5,2) DEFAULT '0.00',
  `total` decimal(18,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sales_items_invoice` (`invoice_id`),
  KEY `idx_sales_items_tenant_prod` (`tenant_id`,`product_id`),
  KEY `fk_sales_items_product` (`product_id`),
  CONSTRAINT `fk_sales_items_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sales_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_sales_items_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_items`
--

LOCK TABLES `sales_items` WRITE;
/*!40000 ALTER TABLE `sales_items` DISABLE KEYS */;
INSERT INTO `sales_items` VALUES (1,5,1,27,'Cinturon Cuero',2.000000,20.000000,0.00,0.00,40.00,'2025-09-18 00:09:05'),(2,5,2,27,'Cinturon Cuero',1.000000,20.000000,0.00,0.00,20.00,'2025-09-18 02:44:42'),(3,5,2,34,'Excremento',2.000000,100.000000,0.00,0.00,200.00,'2025-09-18 02:44:42'),(4,5,4,37,'Pantalón Denim',6.000000,790.000000,0.00,0.00,4740.00,'2025-09-21 03:51:14');
/*!40000 ALTER TABLE `sales_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `special_prices`
--

DROP TABLE IF EXISTS `special_prices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `special_prices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `customer_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `price` decimal(18,2) NOT NULL,
  `currency` char(3) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'NIO',
  `active_from` datetime DEFAULT NULL,
  `active_to` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sp_tenant_customer_product_active` (`tenant_id`,`customer_id`,`product_id`,`active_to`),
  KEY `idx_sp_lookup` (`tenant_id`,`customer_id`,`product_id`,`active_from`,`active_to`),
  KEY `fk_sp_customer` (`customer_id`),
  KEY `fk_sp_product` (`product_id`),
  CONSTRAINT `fk_sp_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sp_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sp_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `special_prices`
--

LOCK TABLES `special_prices` WRITE;
/*!40000 ALTER TABLE `special_prices` DISABLE KEYS */;
/*!40000 ALTER TABLE `special_prices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `store_order_items`
--

DROP TABLE IF EXISTS `store_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `store_order_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `order_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `quantity` decimal(18,6) NOT NULL,
  `unit_price` decimal(18,6) NOT NULL,
  `total` decimal(18,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_store_items_order` (`order_id`),
  KEY `fk_store_items_tenant` (`tenant_id`),
  KEY `fk_store_items_product` (`product_id`),
  CONSTRAINT `fk_store_items_order` FOREIGN KEY (`order_id`) REFERENCES `store_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_store_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_store_items_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `store_order_items`
--

LOCK TABLES `store_order_items` WRITE;
/*!40000 ALTER TABLE `store_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `store_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `store_orders`
--

DROP TABLE IF EXISTS `store_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `store_orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `number` varchar(64) COLLATE utf8mb4_general_ci NOT NULL,
  `status` enum('cart','pending','paid','fulfilled','cancelled') COLLATE utf8mb4_general_ci DEFAULT 'cart',
  `subtotal` decimal(18,2) NOT NULL DEFAULT '0.00',
  `tax_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `shipping_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `discount_total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total` decimal(18,2) NOT NULL DEFAULT '0.00',
  `currency` char(3) COLLATE utf8mb4_general_ci DEFAULT 'NIO',
  `placed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `guest_name` varchar(160) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `guest_email` varchar(160) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `guest_phone` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `shipping_address` varchar(280) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_store_orders_tenant_number` (`tenant_id`,`number`),
  KEY `idx_store_orders_tenant_status` (`tenant_id`,`status`),
  KEY `fk_store_orders_customer` (`customer_id`),
  CONSTRAINT `fk_store_orders_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_store_orders_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `store_orders`
--

LOCK TABLES `store_orders` WRITE;
/*!40000 ALTER TABLE `store_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `store_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `name` varchar(160) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(160) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tax_id` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` varchar(240) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_suppliers_tenant_name` (`tenant_id`,`name`),
  CONSTRAINT `fk_suppliers_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `taxes`
--

DROP TABLE IF EXISTS `taxes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `taxes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `rate` decimal(5,2) NOT NULL DEFAULT '15.00',
  `inclusive` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_taxes_tenant_name` (`tenant_id`,`name`),
  CONSTRAINT `fk_taxes_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `taxes`
--

LOCK TABLES `taxes` WRITE;
/*!40000 ALTER TABLE `taxes` DISABLE KEYS */;
/*!40000 ALTER TABLE `taxes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenants`
--

DROP TABLE IF EXISTS `tenants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `legal_name` varchar(160) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tax_id` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `country` varchar(2) COLLATE utf8mb4_general_ci DEFAULT 'NI',
  `phone` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(160) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `plan` enum('free','pro','business') COLLATE utf8mb4_general_ci DEFAULT 'free',
  `status` enum('active','suspended','closed') COLLATE utf8mb4_general_ci DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tenants_name` (`name`),
  KEY `idx_tenants_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenants`
--

LOCK TABLES `tenants` WRITE;
/*!40000 ALTER TABLE `tenants` DISABLE KEYS */;
INSERT INTO `tenants` VALUES (1,'DemoPYME','Demo PYME S.A.','J03123456','NI',NULL,NULL,'free','active','2025-09-14 04:42:29','2025-09-14 04:42:29',NULL),(2,'MiPrimeraPyme',NULL,NULL,'NI',NULL,NULL,'free','active','2025-09-14 04:48:06','2025-09-14 04:48:06',NULL),(3,'Acme',NULL,NULL,'NI',NULL,NULL,'free','active','2025-09-14 05:12:00','2025-09-14 05:12:00',NULL),(4,'Acme Labs',NULL,NULL,'NI',NULL,NULL,'free','active','2025-09-14 05:18:28','2025-09-14 05:18:28',NULL),(5,'DemoPyme2',NULL,NULL,'NI',NULL,NULL,'free','active','2025-09-16 02:29:54','2025-09-16 02:29:54',NULL),(6,'Contadeto',NULL,NULL,'NI',NULL,NULL,'free','active','2025-09-16 05:20:32','2025-09-16 05:20:32',NULL);
/*!40000 ALTER TABLE `tenants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(160) COLLATE utf8mb4_general_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `role` enum('owner','admin','manager','seller','viewer') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'viewer',
  `status` enum('active','invited','disabled') COLLATE utf8mb4_general_ci DEFAULT 'active',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_tenant_email` (`tenant_id`,`email`),
  KEY `idx_users_tenant_role` (`tenant_id`,`role`),
  CONSTRAINT `fk_users_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,1,'Owner Demo','owner@demopyme.com','$2y$hashdeejemplo','owner','active',NULL,'2025-09-14 04:42:29','2025-09-14 04:42:29',NULL),(2,2,'Diego','diego@example.com','$2a$11$WBuoQuxCmOehJXQyxme2X.4rCl2RRHYpg00LiIVJCvm910rBRvEa2','owner','active',NULL,'2025-09-14 04:48:07','2025-09-14 04:48:07',NULL),(3,1,'Propietario ACME','owner@acme.com','$2a$11$CzQaIY6T8ZT.hqpPz8rdOe5pVYvNfJLPxH2bnZsEtJ6i.EbkmTn2G','owner','active',NULL,'2025-09-14 05:09:22','2025-09-14 05:16:22',NULL),(4,3,'Owner','owner@acme.com','$2a$11$CzQaIY6T8ZT.hqpPz8rdOe5pVYvNfJLPxH2bnZsEtJ6i.EbkmTn2G','owner','active',NULL,'2025-09-14 05:12:00','2025-09-14 05:16:22',NULL),(5,4,'Alice Owner','owner2@acme.com','$2a$11$J5f/26WPdYuiVtTFhuVF0OHvSP75uSOmH9/WdX6FrcI1WKqsw2sTS','owner','active','2025-09-14 06:23:56','2025-09-14 05:18:28','2025-09-14 00:23:55',NULL),(6,5,'Owner','owner2@demo.com','$2a$11$f7QKmZpFUqc258c7cTPbVeKnL/uWunj2woydp5Kg8ZdG630dhNXBq','owner','active','2025-09-21 05:33:38','2025-09-16 02:29:54','2025-09-20 23:33:38',NULL),(7,6,'Dueño dos','dueño@gmail.com','$2a$11$vXtNKYG7gElfw4vZ4BKcdOocEIDmrN5xk2Lm6DQgpDi/BeHUfw3Yu','owner','active','2025-09-21 05:12:50','2025-09-16 05:20:32','2025-09-20 23:12:49',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `v_avg_cost`
--

DROP TABLE IF EXISTS `v_avg_cost`;
/*!50001 DROP VIEW IF EXISTS `v_avg_cost`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_avg_cost` AS SELECT 
 1 AS `tenant_id`,
 1 AS `product_id`,
 1 AS `avg_unit_cost`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_stock`
--

DROP TABLE IF EXISTS `v_stock`;
/*!50001 DROP VIEW IF EXISTS `v_stock`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_stock` AS SELECT 
 1 AS `tenant_id`,
 1 AS `product_id`,
 1 AS `warehouse_id`,
 1 AS `qty`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `warehouses`
--

DROP TABLE IF EXISTS `warehouses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `warehouses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `TenantId` bigint unsigned NOT NULL,
  `Name` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `Notes` text COLLATE utf8mb4_general_ci,
  `Address` varchar(240) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `Code` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `UpdatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `DeletedAt` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_Warehouses_TenantId_Name` (`TenantId`,`Name`),
  KEY `IX_Warehouses_TenantId_Name` (`TenantId`,`Name`),
  CONSTRAINT `FK_Warehouses_Tenants_TenantId` FOREIGN KEY (`TenantId`) REFERENCES `tenants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warehouses`
--

LOCK TABLES `warehouses` WRITE;
/*!40000 ALTER TABLE `warehouses` DISABLE KEYS */;
INSERT INTO `warehouses` VALUES (1,1,'Principal',NULL,NULL,NULL,'2025-09-16 22:22:39.656914','2025-09-16 22:25:40.939880',NULL),(2,5,'Almacen de los papus',NULL,'asdasdasd',NULL,'2025-09-17 04:30:10.523212','2025-09-21 03:48:14.412687',NULL),(3,5,'asd',NULL,NULL,NULL,'2025-09-17 04:30:15.579700','2025-09-17 20:16:05.820246','2025-09-18 02:16:05.814721'),(4,5,'Ciudad Jardin',NULL,NULL,NULL,'2025-09-18 02:30:21.146227','2025-09-18 02:30:21.146227',NULL);
/*!40000 ALTER TABLE `warehouses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `v_avg_cost`
--

/*!50001 DROP VIEW IF EXISTS `v_avg_cost`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_avg_cost` AS select `inventory_movements`.`tenant_id` AS `tenant_id`,`inventory_movements`.`product_id` AS `product_id`,(case when (sum((case when (`inventory_movements`.`movement_type` = 'in') then `inventory_movements`.`quantity` else 0 end)) = 0) then 0 else (sum((case when (`inventory_movements`.`movement_type` = 'in') then (`inventory_movements`.`quantity` * `inventory_movements`.`unit_cost`) else 0 end)) / nullif(sum((case when (`inventory_movements`.`movement_type` = 'in') then `inventory_movements`.`quantity` else 0 end)),0)) end) AS `avg_unit_cost` from `inventory_movements` group by `inventory_movements`.`tenant_id`,`inventory_movements`.`product_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_stock`
--

/*!50001 DROP VIEW IF EXISTS `v_stock`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_stock` AS select `im`.`tenant_id` AS `tenant_id`,`im`.`product_id` AS `product_id`,`im`.`warehouse_id` AS `warehouse_id`,sum((case when (`im`.`movement_type` = 'in') then `im`.`quantity` when (`im`.`movement_type` = 'out') then -(`im`.`quantity`) else 0 end)) AS `qty` from `inventory_movements` `im` group by `im`.`tenant_id`,`im`.`product_id`,`im`.`warehouse_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-20 23:46:08
