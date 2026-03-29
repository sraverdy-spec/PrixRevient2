<?php
/**
 * Déconnexion
 */
require_once 'config.php';

session_destroy();
redirect('login.php');
