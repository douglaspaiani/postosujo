-- CreateTable
CREATE TABLE `denuncias` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `endereco` VARCHAR(191) NOT NULL,
    `cidade` VARCHAR(191) NOT NULL,
    `lat` DOUBLE NOT NULL,
    `lng` DOUBLE NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `dataDenuncia` DATETIME(3) NOT NULL,
    `bandeira` VARCHAR(191) NULL,
    `foto` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
