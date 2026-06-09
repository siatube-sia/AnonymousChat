<script setup lang="ts">
import { ref, provide } from 'vue';
import { useCrypto } from './composables/useCrypto';
import KeyManager from './components/KeyManager.vue';
import ContactManager from './components/ContactManager.vue';
import EncryptPanel from './components/EncryptPanel.vue';
import DecryptPanel from './components/DecryptPanel.vue';

const cryptoState = useCrypto();
provide('cryptoState', cryptoState);

const selectedContactKey = ref('');

const onSelectContact = (key: string) => {
  selectedContactKey.value = key;
  document.getElementById('encrypt-section')?.scrollIntoView({ behavior: 'smooth' });
};
</script>

<template>
  <div class="app-container">
    <header>
      <h1>Secure Copy-Paste Chat</h1>
      <p class="subtitle">
        前方秘匿性(PFS)と署名検証を備えた、最強のコピペ暗号化ツール<br>
        <small>Powered by Vue 3 & Libsodium (X25519 + XChaCha20-Poly1305 + Ed25519)</small>
      </p>
    </header>

    <main>
      <div class="full-width">
        <KeyManager />
      </div>

      <div class="grid-layout">
        <div class="main-column">
          <div id="encrypt-section">
            <EncryptPanel :initialTargetKey="selectedContactKey" />
          </div>
          <DecryptPanel />
        </div>

        <div class="side-column">
          <ContactManager @select-contact="onSelectContact" />
        </div>
      </div>
    </main>

    <footer>
      <p>注意: 秘密鍵のパスワードを忘れると復旧できません。セキュリティのため、通信ログはこのツールに保存されません。</p>
    </footer>
  </div>
</template>

<style scoped>
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: relative;
}

@media (min-width: 769px) {
  .app-container {
    padding: 28px;
  }
}

header {
  text-align: center;
  color: var(--color-text-dark);
  padding: 38px 18px 30px;
  border-radius: 24px;
  margin-bottom: 16px;
  background:
    linear-gradient(135deg, rgba(246, 251, 251, 0.7), rgba(246, 251, 251, 0.48)),
    radial-gradient(circle at 18% 18%, rgba(59, 224, 211, 0.12), transparent 34%),
    radial-gradient(circle at 88% 22%, rgba(255, 118, 163, 0.08), transparent 32%);
  box-shadow:
    0 12px 34px rgba(30, 43, 73, 0.07),
    inset 0 1px 0 rgba(255, 255, 255, 0.44);
  backdrop-filter: blur(14px) saturate(112%);
}

@media (min-width: 769px) {
  header {
    border-radius: 28px;
  }
}

header h1 {
  color: #102033;
  margin: 0 0 12px 0;
  font-size: 34px;
  line-height: 1.1;
  letter-spacing: 0;
}

@media (max-width: 768px) {
  header h1 {
    font-size: 27px;
    margin: 0 0 8px 0;
  }
}

.subtitle {
  color: rgba(16, 32, 51, 0.72);
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .subtitle {
    font-size: 12px;
  }
}

.subtitle small {
  display: block;
  margin-top: 8px;
  font-size: 11px;
  opacity: 0.85;
}

main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.full-width {
  margin-bottom: 0;
}

.grid-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  flex: 1;
}

@media (min-width: 769px) {
  .grid-layout {
    grid-template-columns: 2fr 1fr;
    gap: 18px;
  }
}

.main-column {
  display: flex;
  flex-direction: column;
  gap: 0;
}

@media (min-width: 769px) {
  .main-column {
    gap: 18px;
  }
}

.side-column {
  order: -1;
}

@media (min-width: 769px) {
  .side-column {
    order: 1;
  }
}

footer {
  margin-top: auto;
  text-align: center;
  font-size: 0.8rem;
  color: rgba(16, 32, 51, 0.58);
  padding: 18px 16px;
  background: rgba(246, 251, 251, 0.42);
  border-radius: 20px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.38);
  backdrop-filter: blur(12px) saturate(110%);
  margin-left: 0;
  margin-right: 0;
  margin-bottom: 0;
}

@media (min-width: 769px) {
  footer {
    border-radius: 0 0 12px 12px;
    margin-top: 20px;
    margin-left: 0;
    margin-right: 0;
  }
}

@media (max-width: 768px) {
  footer p {
    margin: 0;
    padding: 0 12px;
    font-size: 12px;
    line-height: 1.4;
  }
}
</style>
