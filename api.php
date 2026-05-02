<?php
// =====================================================
//  Canteen System — Unified JSON API
//  All actions go through: api.php?action=XXX
//
//  USER TYPES:
//    student  — balance accumulates (added to tuition)
//    teacher  — balance accumulates (deducted from salary)
//    staff    — canteen staff; can access admin dashboard
//
//  BALANCE LOGIC:
//    When a purchase is made, the buyer's balance INCREASES
//    (representing the amount owed to the canteen).
//    No top-up needed — the canteen is fully cashless/credit-based.
// =====================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

session_start();
include 'config.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// ── helpers ─────────────────────────────────────────
function ok($data = [])  { echo json_encode(['ok' => true] + $data); exit; }
function err($msg)        { http_response_code(400); echo json_encode(['ok' => false, 'error' => $msg]); exit; }
function safe($v)         { global $conn; return $conn->real_escape_string(trim($v)); }

function requireAuth() {
    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Not logged in.']);
        exit;
    }
}

function requireStaff() {
    requireAuth();
    if (($_SESSION['user_type'] ?? '') !== 'staff') {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Access denied. Staff only.']);
        exit;
    }
}

// ============================================================
//  AUTH
// ============================================================

// POST  action=register  name  user_type  password
if ($action === 'register') {
    $name     = safe($_POST['name']      ?? '');
    $type     = safe($_POST['user_type'] ?? 'student');
    $password = trim($_POST['password']  ?? '');

    if (!$name)                err('Name is required.');
    if (strlen($password) < 6) err('Password must be at least 6 characters.');
    if (!in_array($type, ['student','teacher'])) err('Self-registration is only for students and teachers.');

    $stmt = $conn->prepare("SELECT user_id FROM users WHERE name = ?");
    $stmt->bind_param('s', $name);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) err('A user with that name already exists.');

    $hash    = password_hash($password, PASSWORD_DEFAULT);
    $balance = 0.0;
    $stmt    = $conn->prepare("INSERT INTO users (name, user_type, balance, password) VALUES (?, ?, ?, ?)");
    $stmt->bind_param('ssds', $name, $type, $balance, $hash);
    $stmt->execute();
    $uid = $conn->insert_id;

    $_SESSION['user_id']   = $uid;
    $_SESSION['user_name'] = $name;
    $_SESSION['user_type'] = $type;

    ok(['user_id' => $uid, 'name' => $name, 'user_type' => $type, 'balance' => 0.0]);
}

// POST  action=login  name  password
if ($action === 'login') {
    $name     = safe($_POST['name']     ?? '');
    $password = trim($_POST['password'] ?? '');

    if (!$name || !$password) err('Name and password are required.');

    $stmt = $conn->prepare("SELECT * FROM users WHERE name = ?");
    $stmt->bind_param('s', $name);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if (!$user)                                          err('User not found.');
    if (!password_verify($password, $user['password'])) err('Incorrect password.');

    $_SESSION['user_id']   = $user['user_id'];
    $_SESSION['user_name'] = $user['name'];
    $_SESSION['user_type'] = $user['user_type'];

    ok([
        'user_id'   => $user['user_id'],
        'name'      => $user['name'],
        'user_type' => $user['user_type'],
        'balance'   => (float)$user['balance'],
    ]);
}

// POST  action=logout
if ($action === 'logout') {
    session_destroy();
    ok();
}

// GET  action=me
if ($action === 'me') {
    if (empty($_SESSION['user_id'])) { ok(['logged_in' => false]); }
    $uid  = (int)$_SESSION['user_id'];
    $user = $conn->query("SELECT user_id, name, user_type, balance FROM users WHERE user_id=$uid")->fetch_assoc();
    ok(['logged_in' => true, 'user' => $user]);
}

// ── all routes below require a valid session ─────────
requireAuth();

// ============================================================
//  USER SELF-SERVICE (students & teachers)
// ============================================================

// GET  action=my_profile  — balance + 30-day spending + recent transactions
if ($action === 'my_profile') {
    $uid  = (int)$_SESSION['user_id'];
    $user = $conn->query("SELECT user_id, name, user_type, balance FROM users WHERE user_id=$uid")->fetch_assoc();

    // 30-day spending
    $spending = $conn->query(
        "SELECT COALESCE(SUM(total_amount),0) as spent
         FROM transaction
         WHERE user_id=$uid AND transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
    )->fetch_assoc();

    // Budget (students only)
    $budget = null;
    $budgetRow = $conn->query("SELECT budget_limit FROM user_budget WHERE user_id=$uid LIMIT 1")->fetch_assoc();
    if ($budgetRow) $budget = (float)$budgetRow['budget_limit'];

    // Recent transactions (last 10 with items)
    $recent = [];
    $res = $conn->query(
        "SELECT t.transaction_id, t.total_amount, t.transaction_date,
                GROUP_CONCAT(CONCAT(ti.quantity,'x ',p.name) ORDER BY p.name SEPARATOR ', ') as items
         FROM transaction t
         JOIN transaction_item ti ON t.transaction_id = ti.transaction_id
         JOIN product p ON ti.product_id = p.product_id
         WHERE t.user_id=$uid
         GROUP BY t.transaction_id
         ORDER BY t.transaction_date DESC LIMIT 10"
    );
    while ($r = $res->fetch_assoc()) $recent[] = $r;

    ok([
        'user'         => $user,
        'spent_30days' => (float)$spending['spent'],
        'budget'       => $budget,
        'recent'       => $recent,
    ]);
}

// POST  action=set_budget  amount  (students only)
if ($action === 'set_budget') {
    if ($_SESSION['user_type'] !== 'student') err('Only students can set a budget limit.');
    $uid    = (int)$_SESSION['user_id'];
    $amount = (float)($_POST['amount'] ?? 0);
    if ($amount < 0) err('Budget amount must be zero or positive.');

    $stmt = $conn->prepare(
        "INSERT INTO user_budget (user_id, budget_limit)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE budget_limit = VALUES(budget_limit)"
    );
    $stmt->bind_param('id', $uid, $amount);
    $stmt->execute();
    ok(['budget' => $amount]);
}

// ============================================================
//  PRODUCTS  (read: all authenticated; write: staff only)
// ============================================================

if ($action === 'products') {
    $rows = [];
    $res  = $conn->query("SELECT * FROM product ORDER BY product_id ASC");
    while ($r = $res->fetch_assoc()) $rows[] = $r;
    ok(['products' => $rows]);
}

if ($action === 'product_create') {
    requireStaff();
    $name  = safe($_POST['name']  ?? '');
    $price = (float)($_POST['price'] ?? 0);
    $stock = (int)  ($_POST['stock'] ?? 0);
    if (!$name || $price < 0) err('Name and a valid price are required.');
    $stmt = $conn->prepare("INSERT INTO product (name, price, stock) VALUES (?, ?, ?)");
    $stmt->bind_param('sdi', $name, $price, $stock);
    $stmt->execute();
    ok(['id' => $conn->insert_id]);
}

if ($action === 'product_update') {
    requireStaff();
    $id    = (int)($_POST['id'] ?? 0);
    $name  = safe($_POST['name']  ?? '');
    $price = (float)($_POST['price'] ?? 0);
    $stock = (int)  ($_POST['stock'] ?? 0);
    if (!$id || !$name) err('Invalid product data.');
    $stmt = $conn->prepare("UPDATE product SET name=?, price=?, stock=? WHERE product_id=?");
    $stmt->bind_param('sdii', $name, $price, $stock, $id);
    $stmt->execute();
    ok();
}

if ($action === 'product_delete') {
    requireStaff();
    $id = (int)($_POST['id'] ?? 0);
    if (!$id) err('Invalid product ID.');
    $conn->query("DELETE FROM product WHERE product_id=$id");
    ok();
}

// ============================================================
//  USERS  (staff only)
// ============================================================

if ($action === 'users') {
    requireStaff();
    $rows = [];
    $res  = $conn->query("SELECT user_id, name, balance, user_type FROM users ORDER BY name ASC");
    while ($r = $res->fetch_assoc()) $rows[] = $r;
    ok(['users' => $rows]);
}

if ($action === 'user_create') {
    requireStaff();
    $name     = safe($_POST['name']      ?? '');
    $type     = safe($_POST['user_type'] ?? 'student');
    $password = trim($_POST['password']  ?? '');
    if (!$name)                err('Name is required.');
    if (strlen($password) < 6) err('Password must be at least 6 characters.');
    if (!in_array($type, ['student','teacher','staff'])) err('Invalid account type.');
    $hash    = password_hash($password, PASSWORD_DEFAULT);
    $balance = 0.0;
    $stmt    = $conn->prepare("INSERT INTO users (name, user_type, balance, password) VALUES (?, ?, ?, ?)");
    $stmt->bind_param('ssds', $name, $type, $balance, $hash);
    $stmt->execute();
    ok(['id' => $conn->insert_id]);
}

// ============================================================
//  PURCHASE  (staff processes on behalf of a student/teacher)
// ============================================================

if ($action === 'purchase') {
    requireStaff();
    $uid   = (int)($_POST['user_id'] ?? 0);
    $items = json_decode($_POST['items'] ?? '[]', true);

    if (!$uid || empty($items)) err('User and at least one item are required.');

    $user = $conn->query("SELECT * FROM users WHERE user_id=$uid")->fetch_assoc();
    if (!$user)                              err('User not found.');
    if ($user['user_type'] === 'staff')      err('Cannot make purchases for a staff account.');

    // Pre-calculate for budget check
    $total = 0; $enriched = [];
    foreach ($items as $item) {
        $pid = (int)($item['product_id'] ?? 0);
        $qty = (int)($item['quantity']   ?? 1);
        if (!$pid || $qty < 1) err('Invalid item in cart.');
        $prod = $conn->query("SELECT * FROM product WHERE product_id=$pid")->fetch_assoc();
        if (!$prod) err("Product #$pid not found.");
        if ($prod['stock'] < $qty) err('Not enough stock for "' . $prod['name'] . '" (only ' . $prod['stock'] . ' left).');
        $subtotal = $prod['price'] * $qty;
        $total   += $subtotal;
        $enriched[] = ['prod' => $prod, 'qty' => $qty, 'subtotal' => $subtotal];
    }

    // Budget enforcement for students
    if ($user['user_type'] === 'student') {
        $budgetRow = $conn->query("SELECT budget_limit FROM user_budget WHERE user_id=$uid LIMIT 1")->fetch_assoc();
        if ($budgetRow && (float)$budgetRow['budget_limit'] > 0) {
            $limit   = (float)$budgetRow['budget_limit'];
            $spent30 = (float)$conn->query(
                "SELECT COALESCE(SUM(total_amount),0) as s FROM transaction
                 WHERE user_id=$uid AND transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
            )->fetch_assoc()['s'];
            if (($spent30 + $total) > $limit) {
                err('Budget limit exceeded. Monthly spent: ₱' . number_format($spent30,2) .
                    ', Limit: ₱' . number_format($limit,2) .
                    ', This order: ₱' . number_format($total,2));
            }
        }
    }

    $conn->begin_transaction();
    try {
        $processed_by = (int)$_SESSION['user_id'];
        $stmt = $conn->prepare("INSERT INTO transaction (user_id, processed_by, total_amount) VALUES (?, ?, ?)");
        $stmt->bind_param('iid', $uid, $processed_by, $total);
        $stmt->execute();
        $trans_id = $conn->insert_id;

        $istmt = $conn->prepare("INSERT INTO transaction_item (transaction_id, product_id, quantity, subtotal) VALUES (?, ?, ?, ?)");
        $ustmt = $conn->prepare("UPDATE product SET stock = stock - ? WHERE product_id = ?");
        foreach ($enriched as $e) {
            $pid = (int)$e['prod']['product_id']; $qty = $e['qty']; $subtotal = $e['subtotal'];
            $istmt->bind_param('iiid', $trans_id, $pid, $qty, $subtotal); $istmt->execute();
            $ustmt->bind_param('ii', $qty, $pid); $ustmt->execute();
        }

        // Balance INCREASES — represents amount owed to canteen
        // For students: will be added to tuition bill
        // For teachers: will be deducted from salary
        $conn->query("UPDATE users SET balance = balance + $total WHERE user_id=$uid");
        $conn->commit();

        ok([
            'transaction_id' => $trans_id,
            'total'          => $total,
            'new_balance'    => (float)($user['balance'] + $total),
            'items'          => array_map(fn($e) => [
                'name'     => $e['prod']['name'],
                'qty'      => $e['qty'],
                'subtotal' => $e['subtotal'],
            ], $enriched),
        ]);
    } catch (Exception $ex) { $conn->rollback(); err('Transaction failed: ' . $ex->getMessage()); }
}

// ============================================================
//  REPORTS  (staff only)
// ============================================================

if ($action === 'reports') {
    requireStaff();
    $today = $conn->query(
        "SELECT SUM(total_amount) as sales, COUNT(*) as count
         FROM transaction WHERE DATE(transaction_date) = CURDATE()"
    )->fetch_assoc();
    $rows = [];
    $res  = $conn->query(
        "SELECT t.transaction_id, t.total_amount, t.transaction_date, u.name, u.user_type
         FROM transaction t JOIN users u ON t.user_id = u.user_id
         ORDER BY t.transaction_date DESC LIMIT 50"
    );
    while ($r = $res->fetch_assoc()) $rows[] = $r;
    ok(['today_sales' => (float)($today['sales'] ?? 0), 'today_count' => (int)($today['count'] ?? 0), 'transactions' => $rows]);
}

// ============================================================
//  DASHBOARD  (staff only)
// ============================================================

if ($action === 'dashboard') {
    requireStaff();
    $today        = $conn->query(
        "SELECT SUM(total_amount) as sales, COUNT(*) as count
         FROM transaction WHERE DATE(transaction_date) = CURDATE()"
    )->fetch_assoc();
    $productCount = (int)$conn->query("SELECT COUNT(*) as c FROM product")->fetch_assoc()['c'];
    $lowStock     = (int)$conn->query("SELECT COUNT(*) as c FROM product WHERE stock <= 5")->fetch_assoc()['c'];
    $userCount    = (int)$conn->query("SELECT COUNT(*) as c FROM users WHERE user_type != 'staff'")->fetch_assoc()['c'];
    $recent       = [];
    $res          = $conn->query(
        "SELECT t.transaction_id, t.total_amount, t.transaction_date, u.name, u.user_type
         FROM transaction t JOIN users u ON t.user_id = u.user_id
         ORDER BY t.transaction_date DESC LIMIT 8"
    );
    while ($r = $res->fetch_assoc()) $recent[] = $r;
    ok([
        'today_sales'   => (float)($today['sales'] ?? 0),
        'today_count'   => (int)($today['count'] ?? 0),
        'product_count' => $productCount,
        'low_stock'     => $lowStock,
        'user_count'    => $userCount,
        'recent'        => $recent,
    ]);
}

err('Unknown action: ' . htmlspecialchars($action));