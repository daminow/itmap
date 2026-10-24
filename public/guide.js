(() => {
  const search = document.querySelector('#role-search');
  if (!search) return;
  const cards = [...document.querySelectorAll('[data-search]')];
  const groups = [...document.querySelectorAll('.guide-domain-group')];
  const status = document.querySelector('#search-status');
  search.addEventListener('input', () => {
    const terms = search.value.trim().toLocaleLowerCase('ru').split(/\s+/).filter(Boolean);
    let found = 0;
    for (const card of cards) {
      card.hidden = !terms.every((term) => card.dataset.search.includes(term));
      if (!card.hidden) found += 1;
    }
    for (const group of groups) group.hidden = !group.querySelector('[data-search]:not([hidden])');
    status.textContent = found ? `Найдено профессий: ${found}` : 'Ничего не найдено. Попробуйте другое название или технологию.';
  });
})();
