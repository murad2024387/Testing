// بہتر سنک کرنے کا فنکشن
async function syncWithFirebase() {
  try {
    // سنک کی حالت اپڈیٹ کریں
    updateSyncStatus('سنک شروع ہو رہی ہے...', 'info');
    
    // مقامی ڈیٹا بیس سے پینڈنگ آئٹمز حاصل کریں
    const pendingItems = await localDB.syncQueue.toArray();
    
    if (pendingItems.length === 0) {
      updateSyncStatus('کوئی سنک باقی نہیں', 'success');
      return;
    }

    // ہر آئٹم کو سنک کریں
    for (const item of pendingItems) {
      try {
        switch (item.action) {
          case "ADD":
            // فائر بیس میں ڈیٹا شامل کریں
            const docRef = await addDoc(collection(db, item.collection), item.data);
            
            // مقامی ڈیٹا بیس کو اپڈیٹ کریں
            await localDB.branches.update(item.data.id, {
              firebaseId: docRef.id,
              isSynced: true,
              lastUpdated: new Date().toISOString()
            });
            break;
            
          case "UPDATE":
            // فائر بیس میں ڈیٹا اپڈیٹ کریں
            await updateDoc(doc(db, item.collection, item.data.firebaseId), item.data);
            
            // مقامی ڈیٹا بیس کو اپڈیٹ کریں
            await localDB.branches.update(item.data.id, {
              isSynced: true,
              lastUpdated: new Date().toISOString()
            });
            break;
            
          case "DELETE":
            // فائر بیس سے ڈیٹا حذف کریں
            if (item.data.firebaseId) {
              await deleteDoc(doc(db, item.collection, item.data.firebaseId));
            }
            break;
        }
        
        // سنک کیو سے آئٹم حذف کریں
        await localDB.syncQueue.delete(item.id);
        
      } catch (error) {
        console.error(`سنک میں خرابی (${item.action}):`, error);
        
        // کوششوں کی تعداد بڑھائیں
        await localDB.syncQueue.update(item.id, {
          attempts: (item.attempts || 0) + 1,
          lastError: error.message,
          lastAttempt: new Date().toISOString()
        });
        
        // اگر کوششوں کی تعداد 3 سے زیادہ ہو تو اسکپ کریں
        if (item.attempts >= 3) {
          await localDB.syncQueue.delete(item.id);
        }
      }
    }
    
    updateSyncStatus('سنک مکمل ہو گئی', 'success');
    await loadBranches();
    
  } catch (error) {
    console.error('سنک میں بڑی خرابی:', error);
    updateSyncStatus('سنک میں خرابی', 'danger');
  }
}

// سنک کی حالت دکھانے کا فنکشن
function updateSyncStatus(message, type) {
  const statusElement = document.getElementById('syncStatus');
  statusElement.textContent = message;
  statusElement.className = `alert alert-${type}`;
  
  // 5 سیکنڈ بعد میسج ختم کریں
  if (type !== 'info') {
    setTimeout(() => {
      statusElement.textContent = '';
      statusElement.className = 'alert';
    }, 5000);
  }
}

// نیٹورک کنکشن چیک کرنے کا بہتر طریقہ
async function checkNetworkConnection() {
  try {
    // چھوٹی سی فائل ڈاؤنلوڈ کر کے چیک کریں
    const response = await fetch('https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore-compat.js', {
      method: 'HEAD',
      cache: 'no-store'
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}

// ڈیٹا شامل کرنے کا بہتر طریقہ
async function addBranch(branchData) {
  try {
    // پہلے مقامی ڈیٹا بیس میں شامل کریں
    const id = await localDB.branches.add({
      ...branchData,
      isSynced: false,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });
    
    // سنک کیو میں شامل کریں
    await localDB.syncQueue.add({
      action: "ADD",
      collection: "branches",
      data: { ...branchData, id },
      createdAt: new Date().toISOString(),
      attempts: 0
    });
    
    // اگر آنلائن ہے تو فوری سنک کریں
    if (navigator.onLine && await checkNetworkConnection()) {
      await syncWithFirebase();
    }
    
    return id;
  } catch (error) {
    console.error('برانچ شامل کرنے میں خرابی:', error);
    throw error;
  }
}
