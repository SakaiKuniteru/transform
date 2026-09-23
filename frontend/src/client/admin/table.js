'use strict';

const { q, qa, onReady, datDisabled } = require('../core/dom');

function layRows(table) { return qa('[data-table-row-select]', table); }

function layChecked(table) { return layRows(table).filter((checkbox) => checkbox.checked && !checkbox.disabled); }

function capNhatBulk(table) {
    const checked = layChecked(table);
    const count = checked.length;
    const container = table.closest('[data-admin-table]') || document;
    const countElement = q('[data-table-selected-count]', container);
    if (countElement) { countElement.textContent = String(count); }
    for (const element of qa('[data-table-bulk-action]', container)) { datDisabled(element, count === 0); }
    const selectAll = q('[data-table-select-all]', table);
    const selectable = layRows(table).filter((checkbox) => !checkbox.disabled);
    if (selectAll) {
        selectAll.checked = selectable.length > 0 && count === selectable.length;
        selectAll.indeterminate = count > 0 && count < selectable.length;
    }
}

function initTable(table) {
    if (!table || table.dataset.adminTableInitialized === 'true') { return; }
    table.dataset.adminTableInitialized = 'true';
    const selectAll = q('[data-table-select-all]', table);
    if (selectAll) {
        selectAll.addEventListener('change', () => {
            for (const checkbox of layRows(table)) { if (!checkbox.disabled) { checkbox.checked = selectAll.checked; } }
            capNhatBulk(table);
        });
    }
    for (const checkbox of layRows(table)) { checkbox.addEventListener('change', () => capNhatBulk(table)); }
    capNhatBulk(table);
}

function initTables(root = document) { for (const table of qa('table[data-admin-table], [data-admin-table] table, table.admin-table', root)) { initTable(table); } }

function init() { onReady(() => initTables()); }

init();

module.exports = {
    layRows,
    layChecked,
    capNhatBulk,
    initTable,
    initTables,
    init
};