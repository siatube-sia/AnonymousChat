<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { type Contact, getAllContacts, saveContact, deleteContact } from '../utils/storage';
import { useToast } from 'vue-toastification';

const emit = defineEmits<{
  (e: 'select-contact', publicKey: string): void
}>();

const toast = useToast();
const contacts = ref<Contact[]>([]);
const newName = ref('');
const newKey = ref('');

onMounted(() => {
  contacts.value = getAllContacts();
});

const addContact = () => {
  if (!newName.value || !newKey.value) {
    toast.warning("名前と公開鍵を入力してください。");
    return;
  }
  
  // 簡易的な重複チェック
  if (contacts.value.some(c => c.name === newName.value)) {
    toast.error("その名前は既に登録されています。");
    return;
  }

  const newContact = { name: newName.value, publicKey: newKey.value };
  contacts.value.push(newContact);
  saveContact(newContact);
  
  newName.value = '';
  newKey.value = '';
  toast.success("連絡先を保存しました。");
};

const removeContact = (publicKey: string) => {
  contacts.value = contacts.value.filter(contact => contact.publicKey !== publicKey);
  deleteContact(publicKey);
};

const selectContact = (key: string) => {
  emit('select-contact', key);
  toast.info("暗号化パネルにセットしました。");
};
</script>

<template>
  <section>
    <h2>連絡先リスト</h2>
    
    <div class="add-contact-form">
      <div class="field">
        <label>名前 (表示用)</label>
        <input type="text" v-model="newName" placeholder="例: 太郎" />
      </div>
      <div class="field">
        <label>相手の公開鍵</label>
        <input type="text" v-model="newKey" placeholder="相手から貰った公開鍵を貼り付け" />
      </div>
      <button @click="addContact" class="btn-secondary">追加保存</button>
    </div>

    <hr v-if="contacts.length > 0" />

    <ul class="contact-list">
      <li v-for="contact in contacts" :key="contact.publicKey">
        <div class="contact-info">
          <strong>{{ contact.name }}</strong>
          <span class="key-preview">{{ contact.publicKey.substring(0, 12) }}...</span>
        </div>
        <div class="actions">
          <button @click="selectContact(contact.publicKey)" class="btn-primary btn-sm">選択</button>
          <button @click="removeContact(contact.publicKey)" class="btn-danger btn-sm">削除</button>
        </div>
      </li>
    </ul>
    <p v-if="contacts.length === 0" class="empty-msg">連絡先はまだありません。</p>
  </section>
</template>

<style scoped>
.add-contact-form {
  margin-bottom: 20px;
  background:
    linear-gradient(145deg, var(--surface-soft), var(--surface-muted));
  padding: 15px;
  border-radius: 18px;
}

@media (max-width: 768px) {
  .add-contact-form {
    padding: 12px;
    margin-bottom: 16px;
  }
}

.contact-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.contact-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 16px;
  background: var(--surface-muted);
  margin-bottom: 8px;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .contact-list li {
    flex-direction: column;
    align-items: stretch;
    padding: 12px;
  }
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

@media (max-width: 768px) {
  .contact-info {
    margin-bottom: 8px;
  }
}

.contact-info strong {
  word-break: break-word;
}

.key-preview {
  font-family: monospace;
  color: rgba(16, 32, 51, 0.55);
  font-size: 0.85rem;
  word-break: break-all;
}

.actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .actions {
    width: 100%;
    flex-direction: column;
    gap: 6px;
  }

  .actions button {
    width: 100%;
    padding: 8px 12px !important;
    margin: 0 !important;
  }
}

.actions button {
  padding: 5px 10px;
  font-size: 0.85rem;
}

.btn-sm {
  margin-left: 5px;
}

@media (max-width: 768px) {
  .btn-sm {
    margin-left: 0;
  }
}

.empty-msg {
  text-align: center;
  color: rgba(16, 32, 51, 0.52);
  padding: 20px 12px;
}
</style>
