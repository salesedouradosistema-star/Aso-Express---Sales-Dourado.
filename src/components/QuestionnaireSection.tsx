import React, { useState } from 'react';
import { QuestionnaireCategory, QuestionnaireQuestion } from '../types';
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Check,
  X,
  Sparkles,
  HelpCircle,
  Activity,
  Brain,
  Bone,
  Eye,
  Printer,
  CheckSquare,
  Square,
  FileText,
  Plus,
  PlusCircle,
  Trash2,
  Briefcase,
  Tag,
} from 'lucide-react';

interface QuestionnaireSectionProps {
  categories: QuestionnaireCategory[];
  onChangeCategories: (categories: QuestionnaireCategory[]) => void;
  employeeRole?: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  antecedentes: <Activity className="w-4 h-4 text-teal-600" />,
  saude_mental: <Brain className="w-4 h-4 text-purple-600" />,
  osteomuscular: <Bone className="w-4 h-4 text-amber-600" />,
  visual_auditivo_habitos: <Eye className="w-4 h-4 text-blue-600" />,
  cat_role_specific: <Briefcase className="w-4 h-4 text-indigo-600" />,
};

export const QuestionnaireSection: React.FC<QuestionnaireSectionProps> = ({
  categories,
  onChangeCategories,
  employeeRole,
}) => {
  // Estados para o campo de registrar novas perguntas (espaço em branco por padrão)
  const [newQuestionText, setNewQuestionText] = useState('');
  const [targetCategoryOption, setTargetCategoryOption] = useState<'role_specific' | 'existing' | 'new_cat'>('role_specific');
  const [chosenExistingCatId, setChosenExistingCatId] = useState<string>(categories[0]?.id || 'antecedentes');
  const [customNewCatTitle, setCustomNewCatTitle] = useState('');
  const [newHasDetail, setNewHasDetail] = useState(false);
  const [newDetailLabel, setNewDetailLabel] = useState('Especificar:');
  const [feedbackNotice, setFeedbackNotice] = useState('');

  // Registrar nova pergunta sob demanda para a categoria profissional
  const handleRegisterNewQuestion = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = newQuestionText.trim();
    if (!text) return;

    const newQuestionId = `custom_q_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newQuestion: QuestionnaireQuestion = {
      id: newQuestionId,
      text,
      answer: undefined, // Em branco inicialmente para o examinador preencher ou deixar para papel
      selectedForPrint: true, // Selecionada por padrão para sair impressa no ASO
      hasDetail: newHasDetail,
      detailLabel: newHasDetail ? (newDetailLabel.trim() || 'Especificar:') : undefined,
      detailValue: '',
      isCustom: true,
      roleSpecific: employeeRole?.trim() || undefined,
    };

    let updated = [...categories];

    if (targetCategoryOption === 'role_specific') {
      const specificTitle = employeeRole?.trim()
        ? `PERGUNTAS ESPECÍFICAS: ${employeeRole.trim().toUpperCase()}`
        : 'PERGUNTAS ESPECÍFICAS DA CATEGORIA PROFISSIONAL';

      const existingCatIdx = updated.findIndex(
        (c) => c.id === 'cat_role_specific' || c.title.toUpperCase() === specificTitle.toUpperCase()
      );

      if (existingCatIdx >= 0) {
        updated[existingCatIdx] = {
          ...updated[existingCatIdx],
          active: true,
          questions: [...updated[existingCatIdx].questions, newQuestion],
        };
      } else {
        updated.push({
          id: 'cat_role_specific',
          title: specificTitle,
          active: true,
          questions: [newQuestion],
        });
      }
    } else if (targetCategoryOption === 'new_cat') {
      const catTitle = customNewCatTitle.trim() || 'PERGUNTAS ADICIONAIS DA FUNÇÃO';
      const newCatId = `cat_custom_${Date.now()}`;
      updated.push({
        id: newCatId,
        title: catTitle.toUpperCase(),
        active: true,
        questions: [newQuestion],
      });
      setCustomNewCatTitle('');
    } else {
      // Adicionar na categoria existente selecionada
      const targetId = chosenExistingCatId || categories[0]?.id;
      updated = updated.map((c) => {
        if (c.id === targetId) {
          return {
            ...c,
            active: true,
            questions: [...c.questions, newQuestion],
          };
        }
        return c;
      });
    }

    onChangeCategories(updated);

    // O espaço fica em branco novamente para a próxima pergunta caso pertinente
    setNewQuestionText('');
    setNewHasDetail(false);
    setNewDetailLabel('Especificar:');
    setFeedbackNotice(`Pergunta "${text.slice(0, 35)}${text.length > 35 ? '...' : ''}" registrada com sucesso!`);
    setTimeout(() => setFeedbackNotice(''), 4500);
  };

  // Excluir pergunta personalizada
  const handleDeleteCustomQuestion = (catId: string, questionId: string) => {
    const updated = categories
      .map((cat) => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          questions: cat.questions.filter((q) => q.id !== questionId),
        };
      })
      .filter((cat) => !(cat.id === 'cat_role_specific' && cat.questions.length === 0));
    onChangeCategories(updated);
  };

  // Toggle category expansion (shows/hides questions for that category)
  const handleToggleCategory = (catId: string) => {
    const updated = categories.map((cat) =>
      cat.id === catId ? { ...cat, active: !cat.active } : cat
    );
    onChangeCategories(updated);
  };

  // Toggle selection of a single question for print
  const handleToggleSelectQuestion = (catId: string, questionId: string) => {
    const updated = categories.map((cat) => {
      if (cat.id !== catId) return cat;
      const questions = cat.questions.map((q) => {
        if (q.id !== questionId) return q;
        const currentSelected = q.selectedForPrint ?? (q.answer !== undefined);
        return {
          ...q,
          selectedForPrint: !currentSelected,
        };
      });
      return { ...cat, questions };
    });
    onChangeCategories(updated);
  };

  // Select / Deselect all questions in a single category for print
  const handleToggleCategorySelection = (catId: string, selectAll: boolean) => {
    const updated = categories.map((cat) => {
      if (cat.id !== catId) return cat;
      const questions = cat.questions.map((q) => ({
        ...q,
        selectedForPrint: selectAll,
      }));
      return { ...cat, questions };
    });
    onChangeCategories(updated);
  };

  // Set answer for a single question
  const handleSetAnswer = (
    catId: string,
    questionId: string,
    answer: 'sim' | 'nao'
  ) => {
    const updated = categories.map((cat) => {
      if (cat.id !== catId) return cat;
      const questions = cat.questions.map((q) => {
        if (q.id !== questionId) return q;
        return {
          ...q,
          answer,
          selectedForPrint: true, // Automatically include in print if answered
          detailValue: answer === 'nao' ? '' : q.detailValue || '',
        };
      });
      return { ...cat, questions };
    });
    onChangeCategories(updated);
  };

  // Update detail text
  const handleSetDetail = (
    catId: string,
    questionId: string,
    detailValue: string
  ) => {
    const updated = categories.map((cat) => {
      if (cat.id !== catId) return cat;
      const questions = cat.questions.map((q) =>
        q.id === questionId ? { ...q, detailValue, selectedForPrint: true } : q
      );
      return { ...cat, questions };
    });
    onChangeCategories(updated);
  };

  // Quick fill: mark all questions in a category as "Não"
  const handleMarkCategoryAllNo = (catId: string) => {
    const updated = categories.map((cat) => {
      if (cat.id !== catId) return cat;
      const questions = cat.questions.map((q) => ({
        ...q,
        answer: 'nao' as const,
        selectedForPrint: true,
        detailValue: '',
      }));
      return { ...cat, questions };
    });
    onChangeCategories(updated);
  };

  // Select all questions across all categories for printing on paper (in blank)
  const handleSelectAllForPaper = () => {
    const updated = categories.map((cat) => ({
      ...cat,
      active: true,
      questions: cat.questions.map((q) => ({
        ...q,
        selectedForPrint: true,
      })),
    }));
    onChangeCategories(updated);
  };

  // Global quick fill: mark all questions in ALL categories as "Não"
  const handleMarkAllGlobalNo = () => {
    const updated = categories.map((cat) => ({
      ...cat,
      active: true,
      questions: cat.questions.map((q) => ({
        ...q,
        answer: 'nao' as const,
        selectedForPrint: true,
        detailValue: '',
      })),
    }));
    onChangeCategories(updated);
  };

  // Deselect / Reset all
  const handleResetAll = () => {
    const updated = categories.map((cat) => ({
      ...cat,
      questions: cat.questions.map((q) => ({
        ...q,
        answer: undefined,
        selectedForPrint: false,
        detailValue: '',
      })),
    }));
    onChangeCategories(updated);
  };

  // Count answered and selected questions in a category
  const getCategoryStats = (cat: QuestionnaireCategory) => {
    const answered = cat.questions.filter((q) => q.answer !== undefined).length;
    const simCount = cat.questions.filter((q) => q.answer === 'sim').length;
    const selectedForPrintCount = cat.questions.filter(
      (q) => q.selectedForPrint || q.answer !== undefined
    ).length;
    return {
      answered,
      total: cat.questions.length,
      simCount,
      selectedForPrintCount,
      isAllSelected: selectedForPrintCount === cat.questions.length,
    };
  };

  const totalAnswered = categories.reduce(
    (acc, cat) => acc + cat.questions.filter((q) => q.answer !== undefined).length,
    0
  );
  const totalSelectedForPrint = categories.reduce(
    (acc, cat) =>
      acc + cat.questions.filter((q) => q.selectedForPrint || q.answer !== undefined).length,
    0
  );
  const totalQuestions = categories.reduce((acc, cat) => acc + cat.questions.length, 0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-xs space-y-4">
      
      {/* Header with Title and Global Shortcuts */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
              <ClipboardList className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Questionário Clínico-Ocupacional Especializado
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-600">
              Opcional
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Selecione quais perguntas devem ser impressas no ASO para aplicação in loco no papel, ou clique em &quot;Ver Perguntas&quot; para responder digitalmente.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSelectAllForPaper}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 text-xs font-bold transition-colors border border-indigo-200 dark:border-indigo-700 cursor-pointer"
            title="Seleciona todas as perguntas para saírem impressas no documento para preenchimento manual no papel"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Selecionar Todas para Papel
          </button>

          <button
            type="button"
            onClick={handleMarkAllGlobalNo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/70 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 text-xs font-bold transition-colors border border-teal-200 dark:border-teal-700 cursor-pointer"
            title="Preenche automaticamente todas as perguntas como 'Não' (Sem queixas ou antecedentes)"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            Marcar Todas como "Não"
          </button>

          {(totalSelectedForPrint > 0 || totalAnswered > 0) && (
            <button
              type="button"
              onClick={handleResetAll}
              className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-medium px-2 py-1 transition-colors cursor-pointer"
              title="Desmarcar todas as perguntas"
            >
              Desmarcar Todas
            </button>
          )}
        </div>
      </div>

      {/* CAMPO PARA REGISTRAR NOVAS PERGUNTAS (ESPAÇO FICA EM BRANCO CONFORME SOLICITADO) */}
      <div className="bg-gradient-to-r from-teal-50/70 via-slate-50 to-indigo-50/50 dark:from-slate-800/90 dark:via-slate-800/80 dark:to-teal-950/40 border border-teal-200/90 dark:border-slate-700 rounded-xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-teal-600 dark:bg-teal-500 text-white shadow-2xs">
              <PlusCircle className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Registrar Novas Perguntas a Serem Realizadas
                {employeeRole ? (
                  <span className="font-semibold text-teal-800 dark:text-teal-200 bg-teal-100/90 dark:bg-teal-900/60 border border-teal-200 dark:border-teal-700 px-2 py-0.5 rounded text-[11px]">
                    Função: {employeeRole}
                  </span>
                ) : (
                  <span className="font-normal text-slate-500 dark:text-slate-400 text-[11px]">(Específica para a Categoria Profissional)</span>
                )}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                O espaço fica em branco por padrão. Caso seja pertinente, registre novas perguntas para a categoria profissional deste colaborador.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
            {/* Campo em Branco para Pergunta */}
            <div className="lg:col-span-7">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                Texto da Nova Pergunta a ser Realizada *
              </label>
              <input
                type="text"
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleRegisterNewQuestion();
                  }
                }}
                placeholder={
                  employeeRole
                    ? `Ex: Apresenta vertigem, labirintite ou fobia para a função de ${employeeRole}?`
                    : "Digite a pergunta a ser realizada para esta categoria profissional..."
                }
                className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium shadow-2xs"
              />
            </div>

            {/* Categoria / Seção de Destino */}
            <div className="lg:col-span-5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                Alocar na Categoria / Seção:
              </label>
              <select
                value={
                  targetCategoryOption === 'role_specific'
                    ? 'role_specific'
                    : targetCategoryOption === 'new_cat'
                    ? 'new_cat'
                    : chosenExistingCatId
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'role_specific') {
                    setTargetCategoryOption('role_specific');
                  } else if (val === 'new_cat') {
                    setTargetCategoryOption('new_cat');
                  } else {
                    setTargetCategoryOption('existing');
                    setChosenExistingCatId(val);
                  }
                }}
                className="w-full text-xs px-2.5 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-teal-500 shadow-2xs"
              >
                <option value="role_specific">
                  ★ Específica da Função ({employeeRole || 'Categoria Profissional'})
                </option>
                <optgroup label="Categorias Existentes">
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </optgroup>
                <option value="new_cat">+ Criar Nova Seção / Categoria...</option>
              </select>
            </div>
          </div>

          {targetCategoryOption === 'new_cat' && (
            <div className="pt-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                Nome da Nova Seção / Categoria:
              </label>
              <input
                type="text"
                value={customNewCatTitle}
                onChange={(e) => setCustomNewCatTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleRegisterNewQuestion();
                  }
                }}
                placeholder="Ex: TRABALHO EM ALTURA (NR-35) ou ESPAÇO CONFINADO (NR-33)"
                className="w-full text-xs px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
              />
            </div>
          )}

          {/* Opção de detalhe e Botão de Adicionar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newHasDetail}
                  onChange={(e) => setNewHasDetail(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 h-3.5 w-3.5 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />
                <span>Exigir campo de especificação se a resposta for &quot;Sim&quot;</span>
              </label>

              {newHasDetail && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Rótulo:</span>
                  <input
                    type="text"
                    value={newDetailLabel}
                    onChange={(e) => setNewDetailLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleRegisterNewQuestion();
                      }
                    }}
                    placeholder="Ex: Qual(is)?"
                    className="text-xs px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-28 font-medium"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {feedbackNotice && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  {feedbackNotice}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRegisterNewQuestion()}
                disabled={!newQuestionText.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Pergunta
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Accordions */}
      <div className="space-y-3 pt-1">
        {categories.map((category) => {
          const {
            answered,
            total,
            simCount,
            selectedForPrintCount,
            isAllSelected,
          } = getCategoryStats(category);
          const isExpanded = category.active;

          return (
            <div
              key={category.id}
              className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                isExpanded
                  ? 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850 shadow-2xs'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {/* Category Header */}
              <div className="flex items-center justify-between p-3.5 sm:p-4 text-left select-none focus:outline-none bg-white dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => handleToggleCategory(category.id)}
                  className="flex items-center gap-2.5 flex-1 cursor-pointer text-left"
                >
                  <span className="p-1 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-2xs">
                    {CATEGORY_ICONS[category.id] || <HelpCircle className="w-4 h-4 text-slate-500 dark:text-slate-300" />}
                  </span>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100 block">
                      {category.title}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {total} perguntas • {selectedForPrintCount} selecionadas para impressão {answered > 0 ? `(${answered} respondidas)` : ''}
                    </span>
                  </div>
                </button>

                <div className="flex items-center gap-2">
                  {simCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800 hidden sm:inline-block">
                      {simCount} positivo{simCount > 1 ? 's' : ''} (Sim)
                    </span>
                  )}

                  {/* Category Selection Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleCategorySelection(category.id, !isAllSelected)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                      isAllSelected
                        ? 'bg-teal-50 dark:bg-teal-950/70 border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900/60'
                        : selectedForPrintCount > 0
                        ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                    title={isAllSelected ? 'Desmarcar perguntas desta categoria' : 'Selecionar todas desta categoria para imprimir'}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    )}
                    <span>{isAllSelected ? 'Todas no ASO' : 'Selecionar'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleCategory(category.id)}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                      isExpanded
                        ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-teal-800 dark:hover:text-teal-300'
                    }`}
                    title={isExpanded ? 'Ocultar lista de perguntas desta categoria' : 'Ver e responder perguntas desta categoria'}
                  >
                    <span>{isExpanded ? 'Ocultar Perguntas' : 'Ver Perguntas'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Questions List (Rendered when expanded) */}
              {isExpanded && (
                <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3.5">
                  
                  {/* Category Action bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Printer className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      Marque a caixa à esquerda para escolher as perguntas a imprimir:
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleCategorySelection(category.id, true)}
                        className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Marcar todas
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => handleToggleCategorySelection(category.id, false)}
                        className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                      >
                        Desmarcar
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => handleMarkCategoryAllNo(category.id)}
                        className="text-[11px] font-bold text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-teal-100 bg-teal-50 dark:bg-teal-950/70 hover:bg-teal-100 dark:hover:bg-teal-900/60 px-2 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        Negar todas ("Não")
                      </button>
                    </div>
                  </div>

                  {/* List of individual questions */}
                  <div className="space-y-2.5">
                    {category.questions.map((q) => {
                      const isSim = q.answer === 'sim';
                      const isNao = q.answer === 'nao';
                      const isSelected = q.selectedForPrint ?? (q.answer !== undefined);

                      return (
                        <div
                          key={q.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isSelected
                              ? isSim
                                ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/40 ring-1 ring-amber-300/30'
                                : isNao
                                ? 'border-teal-200 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-950/30'
                                : 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/30'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            
                            {/* Checkbox: Include in Printed Questionnaire */}
                            <label className="flex items-start sm:items-center gap-2.5 flex-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectQuestion(category.id, q.id)}
                                className="mt-0.5 sm:mt-0 rounded text-teal-600 focus:ring-teal-500 h-4 w-4 shrink-0 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                    {q.text}
                                  </span>
                                  {q.isCustom && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 text-[9px] font-bold border border-indigo-200 dark:border-indigo-700">
                                      <Tag className="w-2.5 h-2.5" />
                                      {q.roleSpecific ? `Específica: ${q.roleSpecific}` : 'Personalizada'}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  {isSelected ? (
                                    <span className="text-teal-700 dark:text-teal-400 font-medium inline-flex items-center gap-1">
                                      <Printer className="w-2.5 h-2.5" />
                                      Aparecerá no ASO impresso
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-500">Não selecionada para o ASO</span>
                                  )}
                                  {q.answer ? (
                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                      • Resposta: {q.answer === 'sim' ? 'Sim' : 'Não'}
                                    </span>
                                  ) : isSelected ? (
                                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                      • ( ) Em branco para preencher no papel
                                    </span>
                                  ) : null}
                                </span>
                              </div>
                            </label>

                            {/* Digital Answers: Sim / Não (optional) */}
                            <div className="flex items-center gap-1.5 shrink-0 pl-6 sm:pl-0">
                              <button
                                type="button"
                                onClick={() => handleSetAnswer(category.id, q.id, 'sim')}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  isSim
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                                title="Marcar como Sim (positivo)"
                              >
                                <Check className="w-3 h-3" />
                                Sim
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetAnswer(category.id, q.id, 'nao')}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  isNao
                                    ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                                title="Marcar como Não (negativo / sem queixas)"
                              >
                                <X className="w-3 h-3" />
                                Não
                              </button>

                              {q.answer !== undefined && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = categories.map((cat) => {
                                      if (cat.id !== category.id) return cat;
                                      const questions = cat.questions.map((item) =>
                                        item.id === q.id
                                          ? { ...item, answer: undefined, detailValue: '' }
                                          : item
                                      );
                                      return { ...cat, questions };
                                    });
                                    onChangeCategories(updated);
                                  }}
                                  className="text-[10px] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 px-1 cursor-pointer"
                                  title="Limpar resposta digital (deixar em branco no papel)"
                                >
                                  limpar
                                </button>
                              )}

                              {q.isCustom && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomQuestion(category.id, q.id)}
                                  className="inline-flex items-center gap-1 text-[10px] text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-1.5 py-1 rounded transition-colors cursor-pointer ml-1"
                                  title="Excluir esta pergunta personalizada"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span className="hidden sm:inline">Excluir</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Detail Input if "Sim" and question expects detail */}
                          {isSim && q.hasDetail && (
                            <div className="mt-2.5 pt-2 border-t border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center gap-2 pl-6 sm:pl-0">
                              <label className="text-[11px] font-bold text-amber-900 dark:text-amber-200 shrink-0">
                                {q.detailLabel || 'Especificar:'}
                              </label>
                              <input
                                type="text"
                                value={q.detailValue || ''}
                                onChange={(e) =>
                                  handleSetDetail(category.id, q.id, e.target.value)
                                }
                                placeholder={`Descreva aqui (${q.detailLabel || 'qual/quais'})...`}
                                className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                                autoFocus
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
