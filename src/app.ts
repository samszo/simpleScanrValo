import type { ScanrEntityType } from './types/scanr.ts';
import type { OmekaConfig } from './types/omeka.ts';
import {
  searchStructures,
  searchPersons,
  searchPublications,
  searchProjects,
  getEntityLabel,
  getEntityDescription,
} from './services/scanr.ts';
import { importToOmeka, testOmekaConnection } from './services/omeka.ts';

interface AppState {
  entityType: ScanrEntityType;
  query: string;
  results: Array<{ id: string; entity: Record<string, unknown> }>;
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  selected: Set<string>;
  omekaConfig: OmekaConfig;
  importStatus: Record<string, 'pending' | 'success' | 'error'>;
}

const state: AppState = {
  entityType: 'structures',
  query: '',
  results: [],
  total: 0,
  page: 0,
  pageSize: 20,
  loading: false,
  selected: new Set(),
  omekaConfig: {
    apiUrl: localStorage.getItem('omeka_api_url') ?? '',
    keyIdentity: localStorage.getItem('omeka_key_identity') ?? '',
    keyCredential: localStorage.getItem('omeka_key_credential') ?? '',
  },
  importStatus: {},
};

function notify(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
  const container = document.getElementById('notifications');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `notification notification--${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

function renderResults(): void {
  const container = document.getElementById('results-container');
  if (!container) return;

  if (state.loading) {
    container.innerHTML = '<div class="loading">Recherche en cours…</div>';
    return;
  }

  if (!state.results.length && state.query) {
    container.innerHTML = '<p class="no-results">Aucun résultat trouvé.</p>';
    return;
  }

  if (!state.results.length) {
    container.innerHTML = '<p class="hint">Entrez un terme de recherche pour commencer.</p>';
    return;
  }

  const totalText = `${state.total.toLocaleString('fr-FR')} résultat${state.total > 1 ? 's' : ''}`;
  const html = `
    <div class="results-header">
      <span class="results-count">${totalText}</span>
      <div class="results-actions">
        <button id="select-all-btn" class="btn btn--secondary btn--sm">
          Tout sélectionner
        </button>
        <button id="deselect-all-btn" class="btn btn--secondary btn--sm">
          Tout désélectionner
        </button>
        <button id="import-selected-btn" class="btn btn--primary btn--sm" ${state.selected.size === 0 ? 'disabled' : ''}>
          Importer (${state.selected.size})
        </button>
      </div>
    </div>
    <ul class="results-list">
      ${state.results
        .map(({ id, entity }) => {
          const label = getEntityLabel(entity, state.entityType);
          const desc = getEntityDescription(entity, state.entityType);
          const isSelected = state.selected.has(id);
          const status = state.importStatus[id];
          let statusBadge = '';
          if (status === 'success') statusBadge = '<span class="badge badge--success">Importé ✓</span>';
          else if (status === 'error') statusBadge = '<span class="badge badge--error">Erreur ✗</span>';
          else if (status === 'pending') statusBadge = '<span class="badge badge--pending">En cours…</span>';
          return `
            <li class="result-item ${isSelected ? 'result-item--selected' : ''}">
              <label class="result-item__label">
                <input type="checkbox" class="result-checkbox" data-id="${id}" ${isSelected ? 'checked' : ''}>
                <div class="result-item__content">
                  <span class="result-item__title">${escapeHtml(label)}</span>
                  ${desc ? `<span class="result-item__desc">${escapeHtml(desc)}</span>` : ''}
                </div>
              </label>
              ${statusBadge}
            </li>`;
        })
        .join('')}
    </ul>
    ${renderPagination()}
  `;

  container.innerHTML = html;
  bindResultsEvents();
}

function renderPagination(): string {
  const totalPages = Math.ceil(state.total / state.pageSize);
  if (totalPages <= 1) return '';
  const currentPage = state.page + 1;

  return `
    <div class="pagination">
      <button class="btn btn--secondary btn--sm" id="prev-page-btn" ${state.page === 0 ? 'disabled' : ''}>
        ← Précédent
      </button>
      <span class="pagination__info">Page ${currentPage} / ${totalPages}</span>
      <button class="btn btn--secondary btn--sm" id="next-page-btn" ${state.page >= totalPages - 1 ? 'disabled' : ''}>
        Suivant →
      </button>
    </div>`;
}

function bindResultsEvents(): void {
  document.querySelectorAll<HTMLInputElement>('.result-checkbox').forEach((cb) => {
    cb.addEventListener('change', () => {
      const id = cb.dataset['id']!;
      if (cb.checked) {
        state.selected.add(id);
      } else {
        state.selected.delete(id);
      }
      renderResults();
    });
  });

  document.getElementById('select-all-btn')?.addEventListener('click', () => {
    state.results.forEach(({ id }) => state.selected.add(id));
    renderResults();
  });

  document.getElementById('deselect-all-btn')?.addEventListener('click', () => {
    state.selected.clear();
    renderResults();
  });

  document.getElementById('import-selected-btn')?.addEventListener('click', () => {
    void handleImport();
  });

  document.getElementById('prev-page-btn')?.addEventListener('click', () => {
    if (state.page > 0) {
      state.page--;
      void performSearch();
    }
  });

  document.getElementById('next-page-btn')?.addEventListener('click', () => {
    const totalPages = Math.ceil(state.total / state.pageSize);
    if (state.page < totalPages - 1) {
      state.page++;
      void performSearch();
    }
  });
}

async function performSearch(): Promise<void> {
  if (!state.query.trim()) return;
  state.loading = true;
  renderResults();

  try {
    let response;
    switch (state.entityType) {
      case 'structures':
        response = await searchStructures(state.query, state.page, state.pageSize);
        break;
      case 'persons':
        response = await searchPersons(state.query, state.page, state.pageSize);
        break;
      case 'publications':
        response = await searchPublications(state.query, state.page, state.pageSize);
        break;
      case 'projects':
        response = await searchProjects(state.query, state.page, state.pageSize);
        break;
    }

    state.total = response.total.value;
    state.results = response.results.map((r) => ({
      id: r._id,
      entity: r._source,
    }));
  } catch (err) {
    notify(err instanceof Error ? err.message : 'Erreur lors de la recherche', 'error');
    state.results = [];
    state.total = 0;
  } finally {
    state.loading = false;
    renderResults();
  }
}

async function handleImport(): Promise<void> {
  if (state.selected.size === 0) {
    notify('Aucun élément sélectionné.', 'error');
    return;
  }

  if (!state.omekaConfig.apiUrl) {
    notify('Veuillez configurer l\'URL de l\'API Omeka S.', 'error');
    document.getElementById('omeka-config')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  const selectedItems = state.results.filter(({ id }) => state.selected.has(id));
  notify(`Import de ${selectedItems.length} élément(s)…`, 'info');

  for (const { id, entity } of selectedItems) {
    state.importStatus[id] = 'pending';
    renderResults();

    const result = await importToOmeka(state.omekaConfig, entity, state.entityType);

    if (result.success) {
      state.importStatus[id] = 'success';
      state.selected.delete(id);
      notify(`"${getEntityLabel(entity, state.entityType)}" importé avec succès.`, 'success');
    } else {
      state.importStatus[id] = 'error';
      notify(`Erreur: ${result.error}`, 'error');
    }
    renderResults();
  }
}

function saveOmekaConfig(): void {
  localStorage.setItem('omeka_api_url', state.omekaConfig.apiUrl);
  localStorage.setItem('omeka_key_identity', state.omekaConfig.keyIdentity);
  localStorage.setItem('omeka_key_credential', state.omekaConfig.keyCredential);
  notify('Configuration sauvegardée.', 'success');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function initApp(appEl: HTMLElement): void {
  appEl.innerHTML = `
    <header class="app-header">
      <h1 class="app-title">
        <span class="app-title__scanr">Scanr</span>
        <span class="app-title__arrow">→</span>
        <span class="app-title__omeka">Omeka S</span>
      </h1>
      <p class="app-subtitle">Importez des données Scanr dans votre instance Omeka S</p>
    </header>

    <div id="notifications" class="notifications"></div>

    <main class="app-main">
      <section class="card" id="omeka-config">
        <details>
          <summary class="card__title">⚙ Configuration Omeka S</summary>
          <div class="card__body">
            <div class="form-group">
              <label for="omeka-url">URL de l'API Omeka S</label>
              <input type="url" id="omeka-url" class="input"
                placeholder="https://votre-instance.omeka.net"
                value="${escapeHtml(state.omekaConfig.apiUrl)}">
            </div>
            <div class="form-group">
              <label for="omeka-key-identity">Identifiant de clé API</label>
              <input type="text" id="omeka-key-identity" class="input"
                placeholder="key_identity"
                value="${escapeHtml(state.omekaConfig.keyIdentity)}">
            </div>
            <div class="form-group">
              <label for="omeka-key-credential">Clé API (credential)</label>
              <input type="password" id="omeka-key-credential" class="input"
                placeholder="key_credential"
                value="${escapeHtml(state.omekaConfig.keyCredential)}">
            </div>
            <div class="form-actions">
              <button id="save-config-btn" class="btn btn--primary">Sauvegarder</button>
              <button id="test-config-btn" class="btn btn--secondary">Tester la connexion</button>
            </div>
          </div>
        </details>
      </section>

      <section class="card">
        <h2 class="card__title">🔍 Recherche Scanr</h2>
        <div class="card__body">
          <div class="search-bar">
            <div class="form-group form-group--inline">
              <label for="entity-type">Type d'entité</label>
              <select id="entity-type" class="select">
                <option value="structures">Structures de recherche</option>
                <option value="persons">Personnes (chercheurs)</option>
                <option value="publications">Publications</option>
                <option value="projects">Projets</option>
              </select>
            </div>
            <div class="form-group form-group--grow">
              <label for="search-query">Rechercher</label>
              <input type="search" id="search-query" class="input"
                placeholder="Ex: intelligence artificielle, CNRS, Marie Curie…"
                value="${escapeHtml(state.query)}">
            </div>
            <button id="search-btn" class="btn btn--primary">Rechercher</button>
          </div>
        </div>
      </section>

      <section class="card">
        <h2 class="card__title">📋 Résultats</h2>
        <div class="card__body" id="results-container">
          <p class="hint">Entrez un terme de recherche pour commencer.</p>
        </div>
      </section>
    </main>

    <footer class="app-footer">
      <p>
        Données fournies par <a href="https://scanr.enseignementsup-recherche.gouv.fr/" target="_blank" rel="noopener">Scanr</a>
        — Ministère de l'Enseignement supérieur et de la Recherche
      </p>
    </footer>
  `;

  // Bind Omeka config events
  document.getElementById('save-config-btn')?.addEventListener('click', () => {
    const url = (document.getElementById('omeka-url') as HTMLInputElement).value.trim();
    const keyId = (document.getElementById('omeka-key-identity') as HTMLInputElement).value.trim();
    const keyCred = (document.getElementById('omeka-key-credential') as HTMLInputElement).value.trim();
    state.omekaConfig = { apiUrl: url, keyIdentity: keyId, keyCredential: keyCred };
    saveOmekaConfig();
  });

  document.getElementById('test-config-btn')?.addEventListener('click', () => {
    const url = (document.getElementById('omeka-url') as HTMLInputElement).value.trim();
    const keyId = (document.getElementById('omeka-key-identity') as HTMLInputElement).value.trim();
    const keyCred = (document.getElementById('omeka-key-credential') as HTMLInputElement).value.trim();
    void testOmekaConnection({ apiUrl: url, keyIdentity: keyId, keyCredential: keyCred }).then((result) => {
      if (result.ok) {
        notify('Connexion à Omeka S réussie !', 'success');
      } else {
        notify(`Échec de connexion : ${result.error}`, 'error');
      }
    });
  });

  // Bind search events
  document.getElementById('search-btn')?.addEventListener('click', () => {
    state.page = 0;
    state.selected.clear();
    state.importStatus = {};
    state.entityType = (document.getElementById('entity-type') as HTMLSelectElement).value as ScanrEntityType;
    state.query = (document.getElementById('search-query') as HTMLInputElement).value.trim();
    void performSearch();
  });

  document.getElementById('search-query')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('search-btn')?.click();
    }
  });
}
