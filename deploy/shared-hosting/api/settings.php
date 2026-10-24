<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

$configFile = __DIR__ . "/platform-settings.json";

// Default configuration fallback
$defaultSettings = [
    "mainnetBaseFeeSol" => 0.15,
    "devnetBaseFeeSol" => 0.0,
    "revokeFreezeFeeSol" => 0.1,
    "revokeMintFeeSol" => 0.1,
    "revokeUpdateFeeSol" => 0.1,
    "absorbNetworkRent" => true,
    "treasuryWalletAddress" => "54Xn6d6X4wHrkZ9eHnC8F2v56yZ8K5j2Q8s7J3k4L5m6",
    "promoDiscountPercent" => 0,
    "promoBannerActive" => false,
    "promoBannerText" => "⚡ Launch Week Special: 20% Off All Authority Revocations!",
    "referralProgramActive" => false,
    "referralFeeSharePercent" => 20,
    "platformTitle" => "Solana Token Studio",
    "platformTagline" => "SPL & Token-2022 Launchpad",
    "supportTelegram" => "https://t.me/solanatokenstudio",
    "supportTwitter" => "https://x.com/solanatokenstudio",
    "supportDiscord" => "https://discord.gg/solana",
    "maintenanceMode" => false,
    "mainnetRpcUrl" => "https://api.mainnet-beta.solana.com",
    "devnetRpcUrl" => "https://api.devnet.solana.com",
    "irysNetwork" => "devnet"
];

// GET: Return current settings
if ($_SERVER["REQUEST_METHOD"] === "GET") {
    if (file_exists($configFile)) {
        $content = file_get_contents($configFile);
        $settings = json_decode($content, true);
        echo json_encode(["success" => true, "settings" => array_merge($defaultSettings, $settings)]);
    } else {
        echo json_encode(["success" => true, "settings" => $defaultSettings]);
    }
    exit();
}

// POST: Save updated settings (passcode protected)
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $headers = getallheaders();
    $authHeader = $headers["Authorization"] ?? $headers["authorization"] ?? "";
    $expectedPassword = getenv("ADMIN_PASSWORD") ?: "admin123";
    
    $token = trim(preg_replace('/^Bearer\s+/i', '', $authHeader));
    if ($token !== $expectedPassword) {
        http_response_code(401);
        echo json_encode(["success" => false, "error" => "Unauthorized"]);
        exit();
    }

    $rawInput = file_get_contents("php://input");
    $body = json_decode($rawInput, true);

    if (!$body) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid JSON payload"]);
        exit();
    }

    $current = file_exists($configFile) ? json_decode(file_get_contents($configFile), true) : $defaultSettings;
    $updated = array_merge($current, $body);

    file_put_contents($configFile, json_encode($updated, JSON_PRETTY_PRINT));
    echo json_encode(["success" => true, "settings" => $updated]);
    exit();
}
