<!DOCTYPE html>
<html lang="ur" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>مراد مسالا - برانچز مینجمنٹ</title>
    <script src="https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore-compat.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            line-height: 1.6;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input, select, textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        button {
            background-color: #4CAF50;
            color: white;
            padding: 10px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: right;
        }
        th {
            background-color: #f2f2f2;
        }
        .sync-status {
            margin-top: 20px;
            padding: 10px;
            border-radius: 4px;
        }
        .online {
            background-color: #d4edda;
            color: #155724;
        }
        .offline {
            background-color: #f8d7da;
            color: #721c24;
        }
    </style>
</head>
<body>
    <h1>مراد مسالا - برانچز مینجمنٹ</h1>
    
    <div id="syncStatus" class="sync-status">
        <span id="statusText">حالت: چیک کر رہے ہیں...</span>
        <button id="syncButton" style="display:none;">ڈیٹا مطابقت پذیر کریں</button>
    </div>
    
    <div class="form-group">
        <label for="branchName">برانچ کا نام:</label>
        <input type="text" id="branchName">
    </div>
    
    <div class="form-group">
        <label for="branchAddress">پتہ:</label>
        <textarea id="branchAddress"></textarea>
    </div>
    
    <div class="form-group">
        <label for="isDefault">ڈیفالٹ برانچ:</label>
        <input type="checkbox" id="isDefault">
    </div>
    
    <button onclick="saveBranch()">برانچ محفوظ کریں</button>
    
    <h2>برانچز کی فہرست</h2>
    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>نام</th>
                <th>پتہ</th>
                <th>ڈیفالٹ</th>
                <th>حالت</th>
            </tr>
        </thead>
        <tbody id="branchesList">
            <!-- یہاں ڈیٹا لوڈ ہوگا -->
        </tbody>
    </table>

    <script>
        // Firebase کنفیگریشن
        const firebaseConfig = {
            apiKey: "AIzaSyDummyApiKey1234567890",
            authDomain: "murad-masala.firebaseapp.com",
            projectId: "murad-masala",
            storageBucket: "murad-masala.appspot.com",
            messagingSenderId: "123456789012",
            appId: "1:123456789012:web:abcdef1234567890"
        };
        
        // Firebase اور Firestore کو شروع کریں
        const firebaseApp = firebase.initializeApp(firebaseConfig);
        const firestore = firebase.firestore();
        
        // Dexie.js ڈیٹا بیس کی ترتیب
        const db = new Dexie("MuradMasalaDB");
        db.version(1).stores({
            branches: "++id,name,address,isDefault,lastSynced",
            syncQueue: "++id,action,collection,data,createdAt"
        });
        
        // نیٹ ورک کی حالت کا پتہ لگائیں
        function updateNetworkStatus() {
            const statusElement = document.getElementById('statusText');
            const syncButton = document.getElementById('syncButton');
            
            if (navigator.onLine) {
                statusElement.textContent = "حالت: آن لائن (ڈیٹا خودکار مطابقت پذیر ہو رہا ہے)";
                document.getElementById('syncStatus').className = "sync-status online";
                syncButton.style.display = "none";
                syncChanges(); // آن لائن ہونے پر فوراً مطابقت پذیری کریں
            } else {
                statusElement.textContent = "حالت: آف لائن (تبدیلیاں مقامی طور پر محفوظ ہو رہی ہیں)";
                document.getElementById('syncStatus').className = "sync-status offline";
                syncButton.style.display = "inline-block";
            }
        }
        
        // برانچ محفوظ کریں (ہائیبرڈ طریقہ)
        async function saveBranch() {
            const branch = {
                name: document.getElementById('branchName').value,
                address: document.getElementById('branchAddress').value,
                isDefault: document.getElementById('isDefault').checked,
                lastSynced: null
            };
            
            // 1. پہلے مقامی ڈیٹا بیس میں محفوظ کریں
            const id = await db.branches.add(branch);
            console.log("مقامی ڈیٹا بیس میں محفوظ ہوا ID:", id);
            
            // 2. مطابقت پذیری کے لیے قطار میں شامل کریں
            await db.syncQueue.add({
                action: "ADD",
                collection: "branches",
                data: { ...branch, id },
                createdAt: new Date().getTime()
            });
            
            // 3. اگر آن لائن ہے تو فوراً سرور پر بھیجیں
            if (navigator.onLine) {
                await syncChanges();
            }
            
            // فہرست کو تازہ کریں
            await loadBranches();
            
            // فارم صاف کریں
            document.getElementById('branchName').value = "";
            document.getElementById('branchAddress').value = "";
            document.getElementById('isDefault').checked = false;
            
            alert("برانچ کامیابی سے محفوظ ہو گئی!");
        }
        
        // سرور کے ساتھ مطابقت پذیری
        async function syncChanges() {
            try {
                const changes = await db.syncQueue.toArray();
                
                for (const change of changes) {
                    switch (change.action) {
                        case "ADD":
                            await firestore.collection(change.collection).doc(change.data.id.toString()).set(change.data);
                            break;
                        case "UPDATE":
                            await firestore.collection(change.collection).doc(change.data.id.toString()).update(change.data);
                            break;
                        case "DELETE":
                            await firestore.collection(change.collection).doc(change.data.id.toString()).delete();
                            break;
                    }
                    
                    // مطابقت پذیری کے بعد مقامی ڈیٹا کو اپ ڈیٹ کریں
                    if (change.collection === "branches" && (change.action === "ADD" || change.action === "UPDATE")) {
                        await db.branches.update(change.data.id, { lastSynced: new Date().getTime() });
                    }
                    
                    // قطار سے ہٹا دیں
                    await db.syncQueue.delete(change.id);
                }
                
                console.log("کامیابی سے مطابقت پذیری ہو گئی!");
            } catch (error) {
                console.error("مطابقت پذیری میں خرابی:", error);
            }
        }
        
        // برانچز لوڈ کریں (مقامی ڈیٹا بیس سے)
        async function loadBranches() {
            const branches = await db.branches.toArray();
            const tableBody = document.getElementById('branchesList');
            tableBody.innerHTML = '';
            
            branches.forEach(branch => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${branch.id}</td>
                    <td>${branch.name}</td>
                    <td>${branch.address}</td>
                    <td>${branch.isDefault ? 'ہاں' : 'نہیں'}</td>
                    <td>${branch.lastSynced ? 'مطابقت پذیر' : 'مطابقت پذیری باقی'}</td>
                `;
                tableBody.appendChild(row);
            });
        }
        
        // سرور سے ڈیٹا ڈاؤن لوڈ کریں اور مقامی ڈیٹا بیس کو اپ ڈیٹ کریں
        async function downloadFromServer() {
            try {
                const snapshot = await firestore.collection("branches").get();
                const branches = snapshot.docs.map(doc => doc.data());
                
                for (const branch of branches) {
                    await db.branches.put({
                        id: branch.id,
                        name: branch.name,
                        address: branch.address,
                        isDefault: branch.isDefault,
                        lastSynced: new Date().getTime()
                    });
                }
                
                console.log("سرور سے ڈیٹا کامیابی سے ڈاؤن لوڈ ہو گیا!");
                await loadBranches();
            } catch (error) {
                console.error("ڈاؤن لوڈ میں خرابی:", error);
            }
        }
        
        // ایپ شروع کریں
        window.onload = async function() {
            // نیٹ ورک کی حالت کا پتہ لگائیں اور لیسنر سیٹ کریں
            updateNetworkStatus();
            window.addEventListener('online', updateNetworkStatus);
            window.addEventListener('offline', updateNetworkStatus);
            
            // سرور سے ابتدائی ڈیٹا ڈاؤن لوڈ کریں (اگر آن لائن ہے)
            if (navigator.onLine) {
                await downloadFromServer();
            } else {
                await loadBranches();
            }
            
            // مطابقت پذیری کے بٹن پر کلک کا لیسنر
            document.getElementById('syncButton').addEventListener('click', syncChanges);
        };
    </script>
</body>
</html>
