<script setup lang="ts">
import { ref, watch, onMounted, inject } from 'vue';
import { useCrypto } from '../composables/useCrypto';
import { hasStoredKey } from '../utils/storage';
import { useToast } from 'vue-toastification';

const cryptoState = inject<ReturnType<typeof useCrypto>>('cryptoState');
const { myPublicKey, isLoading, hasKeyPair, loadKeyPair, generateKeyPair, clearKeyPair } = cryptoState || useCrypto();
const toast = useToast();

const password = ref('');
const showPasswordInput = ref(false);
const currentAction = ref<'load' | 'generate' | null>(null);

const storedKeyExists = ref(false);

onMounted(() => {
  storedKeyExists.value = hasStoredKey();
});

watch(hasKeyPair, (newVal) => {
  if (newVal) {
    password.value = '';
    showPasswordInput.value = false;
    currentAction.value = null;
  }
});

const handleLoadKey = async () => {
  if (password.value.length < 8) {
    toast.error("パスワードは8文字以上必要です。");
    return;
  }
  const success = await loadKeyPair(password.value);
  if (success) {
    storedKeyExists.value = true;
  } else {
  }
};

const handleGenerateKey = async () => {
  if (password.value.length < 8) {
    toast.error("パスワードは8文字以上必要です。");
    return;
  }
  const success = await generateKeyPair(password.value);
  if (success) {
    storedKeyExists.value = true;
  } else {
  }
};

const handleClearKey = () => {
  clearKeyPair();
  storedKeyExists.value = false;
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.info('公開鍵をコピーしました！');
  } catch (err) {
    toast.error('コピーに失敗しました。');
    console.error('Failed to copy: ', err);
  }
};
</script>

<template>
  <section>
    <h2>あなたの秘密鍵の管理</h2>

    <div v-if="isLoading">
      <p>鍵ペアの状態を読み込み中...</p>
    </div>

    <div v-else>
      <div v-if="!hasKeyPair">
        <p>鍵ペアがありません。生成するか、既存の鍵ペアを読み込んでください。</p>
        
        <div v-if="storedKeyExists && !showPasswordInput">
          <button @click="showPasswordInput = true; currentAction = 'load'" class="btn-primary">保存済みの鍵を読み込む</button>
        </div>
        <div v-else-if="!showPasswordInput">
          <button @click="showPasswordInput = true; currentAction = 'generate'" class="btn-secondary">新しい鍵ペアを生成</button>
        </div>

        <div v-if="showPasswordInput" class="password-input-area">
          <label for="keyPassword">秘密鍵を保護するパスワード:</label>
          <div class="password-controls">
            <input 
              type="password" 
              id="keyPassword" 
              v-model="password" 
              placeholder="8文字以上のパスワード" 
              @keyup.enter="currentAction === 'load' ? handleLoadKey() : handleGenerateKey()"
            />
            <button v-if="currentAction === 'load'" @click="handleLoadKey" class="btn-primary">読み込む</button>
            <button v-if="currentAction === 'generate'" @click="handleGenerateKey" class="btn-secondary">生成して保存</button>
            <button @click="showPasswordInput = false; password = ''; currentAction = null" class="btn-info">キャンセル</button>
            <button v-if="storedKeyExists && currentAction === 'load'" @click="handleClearKey" class="btn-danger" title="パスワードを忘れた場合、保存済みの秘密鍵を削除できます">削除</button>
          </div>
        </div>
      </div>

      <div v-else>
        <p><strong>あなたの公開鍵 (相手に教える):</strong></p>
        <div class="input-group">
          <input type="text" readonly :value="myPublicKey" />
          <button @click="copyToClipboard(myPublicKey)" class="btn-primary">Copy</button>
        </div>
        <p class="text-sm text-gray-600">この公開鍵を相手と交換してください。</p>
        <button @click="handleClearKey" class="btn-danger">この端末から鍵を削除する</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.password-input-area {
  margin-top: 15px;
  padding: 15px;
  background: linear-gradient(145deg, var(--surface-soft), var(--surface-muted));
  border-radius: 18px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.36),
    0 6px 18px rgba(31, 45, 75, 0.04);
}

@media (max-width: 768px) {
  .password-input-area {
    padding: 12px;
    margin-top: 12px;
  }
}

.password-controls {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
  align-items: center;
}

@media (max-width: 768px) {
  .password-controls {
    flex-direction: column;
    gap: 8px;
  }

  .password-controls input {
    width: 100%;
    margin-bottom: 0;
  }

  .password-controls button {
    width: 100%;
    margin-right: 0;
    margin-bottom: 0;
  }
}

.password-controls input {
  flex: 1;
  min-width: 200px;
}

.text-sm {
  font-size: 0.85rem;
  color: rgba(16, 32, 51, 0.62);
  margin-top: -10px;
  margin-bottom: 15px;
}

@media (max-width: 768px) {
  .text-sm {
    font-size: 0.8rem;
    margin-top: -8px;
    margin-bottom: 12px;
  }
}

p {
  word-break: break-word;
}
</style>
