import { useState, useMemo, useEffect } from 'react';

/**
 * Generic report-viewer shell (SSRS/Crystal-Reports style):
 *   - top toolbar: page nav, zoom (cosmetic), find box, refresh, export, print
 *   - blue title heading
 *   - sortable column headers (click to toggle asc/desc)
 *   - striped/bordered table body
 *   - footer: "<title> - <date>" on the left, "Page X of Y" on the right
 *
 * The caller keeps ownership of fetching + text search (so Print/Export always
 * act on the full filtered set, not just the current page). This component only
 * owns sorting + pagination of what it's given.
 */
function ReportViewer({
  title,
  columns,          // [{ key, label, align, sortable=true, render(row, idx) }]
  rows,             // already-filtered data array
  rowKey,           // (row) => unique key
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Find...',
  onPrint,
  onExportPDF,
  onExportExcel,
  onRefresh,
  pageSize = 15
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever the underlying (filtered) row set changes
  useEffect(() => {
    setCurrentPage(1);
  }, [rows.length, searchTerm]);

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return rows;
    const col = columns.find(c => c.key === sortConfig.key);
    const sorted = [...rows].sort((a, b) => {
      const av = col?.sortValue ? col.sortValue(a) : (a[sortConfig.key] ?? '');
      const bv = col?.sortValue ? col.sortValue(b) : (b[sortConfig.key] ?? '');
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
    });
    if (sortConfig.direction === 'desc') sorted.reverse();
    return sorted;
  }, [rows, sortConfig, columns]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key, sortable) => {
    if (sortable === false) return;
    setSortConfig(prev => {
      if (prev.key !== key) return { key, direction: 'asc' };
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const sortIndicator = (key, sortable) => {
    if (sortable === false) return null;
    if (sortConfig.key !== key) return <span style={styles.sortIcon}>⇅</span>;
    return <span style={styles.sortIconActive}>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
  };

  const goToPage = (p) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  const today = new Date().toLocaleDateString();

  return (
    <div style={styles.wrapper}>
      {/* ============ TOOLBAR ============ */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarGroup}>
          <button style={styles.iconBtn} title="First page" onClick={() => goToPage(1)} disabled={safePage === 1}>⏮</button>
          <button style={styles.iconBtn} title="Previous page" onClick={() => goToPage(safePage - 1)} disabled={safePage === 1}>◀</button>
          <span style={styles.pageIndicator}>{safePage} of {totalPages}</span>
          <button style={styles.iconBtn} title="Next page" onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages}>▶</button>
          <button style={styles.iconBtn} title="Last page" onClick={() => goToPage(totalPages)} disabled={safePage === totalPages}>⏭</button>
        </div>

        <div style={styles.toolbarGroup}>
          <span style={styles.findIcon}>🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            style={styles.findInput}
          />
        </div>

        <div style={styles.toolbarGroup}>
          {onRefresh && <button style={styles.iconBtn} title="Refresh" onClick={onRefresh}>⟳</button>}
          {onExportExcel && <button style={styles.iconBtn} title="Export to Excel" onClick={onExportExcel}>📊</button>}
          {onExportPDF && <button style={styles.iconBtn} title="Export to PDF" onClick={onExportPDF}>📄</button>}
          {onPrint && <button style={styles.iconBtn} title="Print" onClick={onPrint}>🖨️</button>}
        </div>
      </div>

      {/* ============ TITLE ============ */}
      <h2 style={styles.title}>{title}</h2>

      {/* ============ TABLE ============ */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key, col.sortable)}
                  style={{
                    ...styles.th,
                    textAlign: col.align || 'left',
                    cursor: col.sortable === false ? 'default' : 'pointer'
                  }}
                >
                  {col.label} {sortIndicator(col.key, col.sortable)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={styles.emptyCell}>No records found.</td>
              </tr>
            ) : (
              pageRows.map((row, idx) => (
                <tr key={rowKey(row)} style={idx % 2 === 1 ? styles.trAlt : undefined}>
                  {columns.map(col => (
                    <td key={col.key} style={{ ...styles.td, textAlign: col.align || 'left' }}>
                      {col.render ? col.render(row, (safePage - 1) * pageSize + idx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ============ FOOTER ============ */}
      <div style={styles.footer}>
        <span>{title} - {today}</span>
        <span>Page {safePage} of {totalPages}</span>
      </div>
    </div>
  );
}

const styles = {
  wrapper: { background: '#e9ecef', borderRadius: '10px', padding: '14px', border: '1px solid #cbd5e1' },
  toolbar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#f1f3f5', border: '1px solid #d0d5db', borderRadius: '6px',
    padding: '8px 12px', marginBottom: '16px', flexWrap: 'wrap', gap: '10px'
  },
  toolbarGroup: { display: 'flex', alignItems: 'center', gap: '6px' },
  iconBtn: {
    background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px',
    padding: '5px 9px', cursor: 'pointer', fontSize: '13px', color: '#334155'
  },
  pageIndicator: { fontSize: '13px', color: '#334155', margin: '0 6px', whiteSpace: 'nowrap' },
  findIcon: { fontSize: '13px' },
  findInput: {
    padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1',
    fontSize: '13px', outline: 'none', minWidth: '220px'
  },
  title: { color: '#2b4d80', fontSize: '22px', fontWeight: 700, margin: '4px 0 14px 4px' },
  tableWrapper: { background: '#fff', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 14px', background: '#3c5f8a', color: '#fff', fontSize: '13px',
    fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.15)', userSelect: 'none'
  },
  sortIcon: { fontSize: '10px', color: 'rgba(255,255,255,0.7)', marginLeft: '4px' },
  sortIconActive: { fontSize: '10px', color: '#ffe08a', marginLeft: '4px' },
  td: { padding: '9px 14px', fontSize: '13px', color: '#1f2937', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' },
  trAlt: { backgroundColor: '#f8fafc' },
  emptyCell: { textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '14px' },
  footer: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: '10px', padding: '0 4px', fontSize: '12px', color: '#334155'
  }
};

export default ReportViewer;