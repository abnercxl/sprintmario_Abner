<?php
    $host = 'localhost';
    $port = 3308;
    $user = 'root';
    $pass = '';
    $dbname = 'sprintMario';

    try{
        $pdo = new PDO(
            "mysql:host=$host; port=$port; chatset=utf8mb4",
            $user,
            $pass,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]
        );

        $pdo->exec(
            "CREATE DATABASE if NOT EXISTS `$dbname`"
        );

        $pdo->exec("use `$dbname`");

        $pdo->exec(
            "create table if NOT EXISTS `ranking` (
            `id` int auto_increment primary key,
            `nome` varchar(50) not null,
            `pontos` int not null,
            `dataRegistro` timestamp default current_timestamp)" );

    } catch (PDOException $e){
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');

        echo json_decode([
            'status' => 'error',
            'message' => 'Não foi possível conectar ao Banco de Dados.'    .$e->getMessage()
        ]);

        exit;
    }
?>