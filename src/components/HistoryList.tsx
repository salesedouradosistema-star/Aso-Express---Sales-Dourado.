import React, { useState, useMemo } from 'react';
import { ASORecord, SessionStats } from '../types';
import { formatDateBR } from '../utils/formatters';
import { EXAM_TYPE_LABELS } from '../data/defaultData';
import { deleteASO } from '../services/storageService';
import {
  Search,
  Printer,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building2,
  Calendar,
  Filter,
  User,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface HistoryListProps {
  history: ASORecord[];
  stats?: SessionStats;
  onSelectASOToPrint: (aso: ASORecord) => void;
  onStartNewAttendance: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  history,
  onSelectASOToPrint,
  onStartNewAttendance,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fitnessFilter, setFitnessFilter] = useState<'all' | 'apto' | 'inapto' | 'apto_com_restricoes'>('all');
  const [examTypeFilter, setExamTypeFilter] = useState<string>('all');
  const [asoToDelete, setAsoToDelete] = useState<{ id: string; code: string; name: string } | null>(null);

  // Pagination state: default 5 items per page (selectable from 5 to 50)
  const [pageSize, setPageSize] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        item.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.employee.cpf.includes(searchTerm) ||
        item.employee.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.asoCode.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFitness =
        fitnessFilter === 'all' || item.fitness === fitnessFilter;

      const matchesExamType =
        examTypeFilter === 'all' || item.examType === examTypeFilter;

      return matchesSearch && matchesFitness && matchesExamType;
    });
  }, [history, searchTerm, fitnessFilter, examTypeFilter]);

  // Pagination calculations
  const totalItems = filteredHistory.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    const clamped = Math.min(Math.max(1, newPage), totalPages);
    setCurrentPage(clamped);
  };

  // Helper for generating page numbers with ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (activePage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (activePage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', activePage - 1, activePage, activePage + 1, '...', totalPages];
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col lg:flex-row gap-3 items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por colaborador, CPF ou cargo..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Quick Filter Buttons & Page Size Selector */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          {/* Exibição: Quantidade de itens por página (5 em 50) */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
            <span>Exibir:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs font-semibold text-slate-800 bg-transparent border-0 focus:ring-0 cursor-pointer pr-1 py-0.5"
              title="Quantidade de registros exibidos por página"
            >
              <option value={5}>5 por página</option>
              <option value={10}>10 por página</option>
              <option value={15}>15 por página</option>
              <option value={20}>20 por página</option>
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
            </select>
          </div>
          
          {/* Parecer Filter */}
          <select
            value={fitnessFilter}
            onChange={(e) => {
              setFitnessFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-700"
          >
            <option value="all">Todos os Pareceres</option>
            <option value="apto">Somente Aptos</option>
            <option value="inapto">Somente Inaptos</option>
            <option value="apto_com_restricoes">Com Restrições</option>
          </select>

          {/* Tipo de Exame Filter */}
          <select
            value={examTypeFilter}
            onChange={(e) => {
              setExamTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-700"
          >
            <option value="all">Todos os Tipos de Exame</option>
            <option value="admissional">Admissional</option>
            <option value="periodico">Periódico</option>
            <option value="retorno_trabalho">Retorno ao Trabalho</option>
            <option value="mudanca_risco">Mudança de Risco</option>
            <option value="demissional">Demissional</option>
            <option value="em_branco">Em Branco (Manual)</option>
          </select>
        </div>
      </div>

      {/* ASOs Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredHistory.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <User className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">
              {history.length === 0
                ? 'Nenhum ASO cadastrado. O histórico está limpo.'
                : 'Nenhum ASO encontrado com os filtros atuais.'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Realize um novo atendimento para registrar o primeiro colaborador.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Código / Data</th>
                  <th className="py-3 px-4">Colaborador / CPF</th>
                  <th className="py-3 px-4">Cargo / Setor</th>
                  <th className="py-3 px-4">Tipo de Exame</th>
                  <th className="py-3 px-4">Parecer Médico</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedHistory.map((item) => {
                  const examLabel =
                    EXAM_TYPE_LABELS[item.examType]?.label || item.examType.toUpperCase();

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 block">
                          {item.asoCode}
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDateBR(item.issueDate)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block text-xs">
                          {item.employee.name}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {item.employee.cpf}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {item.employee.role}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {item.employee.department}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200">
                          {examLabel}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.fitness === 'apto' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            APTO
                          </span>
                        )}
                        {item.fitness === 'inapto' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            INAPTO
                          </span>
                        )}
                        {item.fitness === 'apto_com_restricoes' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            COM RESTRIÇÕES
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectASOToPrint(item)}
                            className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold inline-flex items-center gap-1 text-xs transition-colors cursor-pointer"
                            title="Visualizar e Imprimir ASO (A4)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Imprimir</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setAsoToDelete({ id: item.id, code: item.asoCode, name: item.employee.name })}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Excluir ASO"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredHistory.length > 0 && (
          <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            {/* Range info */}
            <div className="text-slate-600 font-medium">
              Exibindo <span className="font-bold text-slate-900">{startIndex + 1}</span> a{' '}
              <span className="font-bold text-slate-900">{endIndex}</span> de{' '}
              <span className="font-bold text-slate-900">{totalItems}</span> registros
            </div>

            {/* Pagination controls */}
            <div className="flex items-center gap-1">
              {/* Primeira página */}
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                disabled={activePage === 1}
                className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-colors"
                title="Primeira página"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Página anterior */}
              <button
                type="button"
                onClick={() => handlePageChange(activePage - 1)}
                disabled={activePage === 1}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 font-medium transition-colors"
                title="Página anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Anterior</span>
              </button>

              {/* Numbered Page Buttons */}
              <div className="flex items-center gap-1 mx-1">
                {getPageNumbers().map((page, idx) => {
                  if (page === '...') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-slate-400 font-bold">
                        ...
                      </span>
                    );
                  }

                  const isCurrent = page === activePage;
                  return (
                    <button
                      key={`page-${page}`}
                      type="button"
                      onClick={() => handlePageChange(Number(page))}
                      className={`min-w-8 h-8 px-2 rounded-md font-semibold text-xs transition-colors ${
                        isCurrent
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              {/* Próxima página */}
              <button
                type="button"
                onClick={() => handlePageChange(activePage + 1)}
                disabled={activePage === totalPages}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 font-medium transition-colors"
                title="Próxima página"
              >
                <span className="hidden sm:inline">Próxima</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Última página */}
              <button
                type="button"
                onClick={() => handlePageChange(totalPages)}
                disabled={activePage === totalPages}
                className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-colors"
                title="Última página"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* In-app ASO Delete Confirmation Modal (no confirm()) */}
      {asoToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-xl space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Excluir ASO</h4>
                <p className="text-xs text-slate-500">Remover atendimento do histórico.</p>
              </div>
            </div>
            <p className="text-xs text-slate-700">
              Deseja remover o ASO <strong className="font-semibold text-slate-900">{asoToDelete.code}</strong> do colaborador <strong className="font-semibold text-slate-900">{asoToDelete.name}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAsoToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteASO(asoToDelete.id);
                  setAsoToDelete(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white transition-colors shadow-xs cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
