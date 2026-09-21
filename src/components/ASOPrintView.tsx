import React, { useState } from 'react';
import { ASORecord } from '../types';
import { formatDateBR, formatLongDate } from '../utils/formatters';
import { EXAM_TYPE_LABELS, getFreshQuestionnaireCategories } from '../data/defaultData';
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  FileText,
} from 'lucide-react';
import {
  getTimbradoConfig,
  setTimbradoConfig,
  DEFAULT_TIMBRADO_URL,
  REMOTE_TIMBRADO_FALLBACK,
} from '../services/storageService';

interface ASOPrintViewProps {
  aso: ASORecord;
  onBackToEdit: () => void;
  onNewAttendance: () => void;
}

export const ASOPrintView: React.FC<ASOPrintViewProps> = ({
  aso,
  onBackToEdit,
  onNewAttendance,
}) => {
  const [useTimbrado, setUseTimbrado] = useState<boolean>(() => getTimbradoConfig().enabled);
  const [printTwoCopies, setPrintTwoCopies] = useState<boolean>(true);
  const showAnamnesisInPrint = true;
  const showQuestionnaireInPrint = true;
  const blankAnamnesisMode = false;
  const printRiskGrade = aso.company.riskGrade || '2';

  const renderRiskGradePrint = (grade?: string) => {
    const g = (grade || '').toLowerCase().trim();
    if (g === 'em_branco' || g === 'branco' || g === 'manuscrito') {
      return (
        <span className="inline-flex items-baseline">
          <span className="font-bold text-black">Grau de Risco:</span>&nbsp;
          <span className="inline-block border-b border-black w-14 h-3 print:border-black text-center align-bottom">
            &nbsp;
          </span>
        </span>
      );
    }
    if (g === 'indeterminado' || g.includes('indeterminado')) {
      return (
        <span>
          <span className="font-bold text-black">Grau de Risco:</span> Indeterminado
        </span>
      );
    }
    return (
      <span>
        <span className="font-bold text-black">Grau de Risco:</span> {grade || '2'}
      </span>
    );
  };

  const [printNotice, setPrintNotice] = useState<string>('');

  const handlePrint = () => {
    try {
      // Defer blocking print call to prevent halting React's Fiber scheduler
      setTimeout(() => {
        try {
          window.print();
        } catch (err) {
          console.warn('Direct print restricted by browser iframe sandbox:', err);
          setPrintNotice(
            'A impressão direta foi restrita pelo navegador. Caso ocorra, use a opção Imprimir do navegador (Ctrl+P).'
          );
        }
      }, 50);
    } catch (err) {
      console.warn('Direct print restricted by browser iframe sandbox:', err);
      setPrintNotice(
        'A impressão direta foi restrita pelo navegador. Caso ocorra, use a opção Imprimir do navegador (Ctrl+P).'
      );
    }
  };

  // Categories and questions: maintain attached data as configured in the attendance, or standard categories
  const rawCategories = aso.questionnaire?.categories && aso.questionnaire.categories.length > 0
    ? aso.questionnaire.categories
    : getFreshQuestionnaireCategories();

  const answeredOrSelected = rawCategories
    .map((cat) => ({
      ...cat,
      questions: cat.questions.filter(
        (q) => q.selectedForPrint === true || q.answer === 'sim' || q.answer === 'nao'
      ),
    }))
    .filter((cat) => cat.questions.length > 0);

  const printableCategories = answeredOrSelected.length > 0 ? answeredOrSelected : rawCategories;
  const hasPrintableQuestions = printableCategories.length > 0;
  const totalPrintableCount = printableCategories.reduce(
    (acc, cat) => acc + cat.questions.length,
    0
  );

  const renderSingleASOSheet = (copyLabel: '1ª VIA - EMPRESA' | '2ª VIA - TRABALHADOR') => {
    const formattedExamType = EXAM_TYPE_LABELS[aso.examType]?.label || aso.examType.toUpperCase();
    const isApto = aso.fitness === 'apto';
    const isInapto = aso.fitness === 'inapto';
    const isComRestricao = aso.fitness === 'apto_com_restricoes';
    const isEmBranco = aso.fitness === 'em_branco';

    // Collect registered/marked risks (NR-7 Item 7.5.19) - apenas os riscos marcados aparecem no documento
    const registeredRisks: { label: string; text: string }[] = [];

    if (aso.risks.noneSpecific) {
      registeredRisks.push({
        label: 'Ausência de Riscos',
        text: 'Não foram identificados riscos ocupacionais específicos para a função (conforme PGR / NR-1 e NR-7).',
      });
    } else {
      if (aso.risks.physical) {
        const sub = aso.risks.physicalSubItems?.length ? aso.risks.physicalSubItems.join(', ') : '';
        const det = aso.risks.physicalDetails?.trim() || '';
        const text = sub && det ? `${sub} (${det})` : sub || det || 'Ruído, calor, frio, vibração, radiações ou umidade (PGR)';
        registeredRisks.push({ label: 'Físicos', text });
      }
      if (aso.risks.chemical) {
        const sub = aso.risks.chemicalSubItems?.length ? aso.risks.chemicalSubItems.join(', ') : '';
        const det = aso.risks.chemicalDetails?.trim() || '';
        const text = sub && det ? `${sub} (${det})` : sub || det || 'Poeiras, fumos, névoas, gases, vapores ou solventes (PGR)';
        registeredRisks.push({ label: 'Químicos', text });
      }
      if (aso.risks.biological) {
        const sub = aso.risks.biologicalSubItems?.length ? aso.risks.biologicalSubItems.join(', ') : '';
        const det = aso.risks.biologicalDetails?.trim() || '';
        const text = sub && det ? `${sub} (${det})` : sub || det || 'Vírus, bactérias, fungos, parasitas ou agentes biológicos (PGR)';
        registeredRisks.push({ label: 'Biológicos', text });
      }
      if (aso.risks.ergonomic) {
        const sub = aso.risks.ergonomicSubItems?.length ? aso.risks.ergonomicSubItems.join(', ') : '';
        const det = aso.risks.ergonomicDetails?.trim() || '';
        const text = sub && det ? `${sub} (${det})` : sub || det || 'Postura inadequada, repetitividade, trabalho sentado/em pé ou esforço (PGR)';
        registeredRisks.push({ label: 'Ergonômicos', text });
      }
      if (aso.risks.accidental) {
        const sub = aso.risks.accidentalSubItems?.length ? aso.risks.accidentalSubItems.join(', ') : '';
        const det = aso.risks.accidentalDetails?.trim() || '';
        const text = sub && det ? `${sub} (${det})` : sub || det || 'Queda, corte, choque elétrico, ferramentas ou máquinas (PGR)';
        registeredRisks.push({ label: 'Acidentes / Mecânicos', text });
      }
      if (aso.risks.psychosocial) {
        const sub = aso.risks.psychosocialSubItems?.length ? aso.risks.psychosocialSubItems.join(', ') : '';
        const det = aso.risks.psychosocialDetails?.trim() || '';
        const text = sub && det ? `${sub} (${det})` : sub || det || 'Sobrecarga, pressão, assédio, conflitos ou estresse ocupacional (PGR)';
        registeredRisks.push({ label: 'Psicossociais', text });
      }
    }

    if (registeredRisks.length === 0) {
      registeredRisks.push({
        label: 'Ausência de Riscos',
        text: 'Ausência de riscos ocupacionais específicos identificados para a função (conforme PGR / NR-1 e NR-7).',
      });
    }

    let secCounter = 6;
    const anamneseSectionNum = showAnamnesisInPrint ? secCounter++ : null;
    const conclusaoSectionNum = secCounter++;

    return (
      <div
        className={`aso-sheet bg-white text-black max-w-[210mm] mx-auto text-[9.5pt] leading-tight font-sans relative ${
          useTimbrado
            ? 'with-timbrado shadow-xl pt-[28mm] pb-[12mm] px-8 border-0'
            : 'border border-slate-900 rounded-none shadow-md p-6 sm:p-8'
        }`}
      >
        {/* Papel Timbrado - Sales & Dourado (Fundo Oficial do Documento) */}
        {useTimbrado && (
          <div className="timbrado-layer absolute inset-0 pointer-events-none select-none z-0">
            <img
              src={DEFAULT_TIMBRADO_URL}
              alt="Papel Timbrado Sales & Dourado"
              className="w-full h-full object-fill pointer-events-none select-none"
              referrerPolicy="no-referrer"
              onError={(e) => {
                if (e.currentTarget.src !== REMOTE_TIMBRADO_FALLBACK) {
                  e.currentTarget.src = REMOTE_TIMBRADO_FALLBACK;
                }
              }}
            />
          </div>
        )}

        <div className="aso-sheet-content relative z-10">
          {/* Document Header - deslocado 0,5 cm para baixo a pedido do usuário */}
          <div className={`border-b-2 border-black pb-1.5 mb-1.5 ${useTimbrado ? 'mt-[0.5cm]' : 'mt-[0.5cm]'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-[13pt] font-extrabold tracking-tight text-black uppercase">
                  Atestado de Saúde Ocupacional - ASO
                </h1>
                <span className="text-[8pt] font-bold text-slate-600 block mt-0.5">
                  Conforme disposições da Norma Regulamentadora NR-7 (Portaria MTP nº 6.734/2021)
                </span>
              </div>

              <div className="text-right pl-3 shrink-0">
                <span className="inline-block border-2 border-black px-2 py-0.5 text-[8pt] font-black tracking-wider uppercase bg-slate-100">
                  {copyLabel}
                </span>
                <span className="block text-[7.5pt] font-mono font-semibold text-slate-800 mt-0.5">
                  {aso.asoCode}
                </span>
              </div>
            </div>
          </div>

        {/* Section 1: Dados da Empresa Contratante */}
        <div className="border border-black p-2 mb-1.5 bg-slate-50/30">
          <div className="text-[7.5pt] font-black uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-0.5 mb-1 flex justify-between items-center">
            <span>1. DADOS DA EMPRESA CONTRATANTE</span>
            <div className="flex items-center gap-1.5 font-normal">
              {renderRiskGradePrint(printRiskGrade)}
              <span className="text-slate-400">|</span>
              <span><span className="font-bold text-black">CNAE:</span> {aso.company.cnae || 'N/A'}</span>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-x-2 gap-y-0.5 text-[8.5pt]">
            <div className="col-span-8">
              <span className="font-bold">Razão Social:</span> {aso.company.name || '—'}
            </div>
            <div className="col-span-4 font-mono">
              <span className="font-bold">CNPJ:</span> {aso.company.cnpj || '—'}
            </div>

            {aso.company.fantasyName && (
              <div className="col-span-12">
                <span className="font-bold">Nome Fantasia:</span> {aso.company.fantasyName}
              </div>
            )}

            <div className="col-span-8">
              <span className="font-bold">Endereço:</span> {aso.company.address || 'Não informado'}
            </div>
            <div className="col-span-4">
              <span className="font-bold">Responsável / SESMT:</span> {aso.company.responsible || 'Diretoria'}
            </div>
          </div>
        </div>

        {/* Section 2: Dados do Trabalhador */}
        <div className="border border-black p-2 mb-1.5">
          <div className="text-[7.5pt] font-black uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-0.5 mb-1 flex justify-between">
            <span>2. DADOS DO TRABALHADOR</span>
            <span>Sexo: {aso.employee.gender === 'M' ? 'Masc' : aso.employee.gender === 'F' ? 'Fem' : aso.employee.gender === 'Outro' ? 'Outro' : '—'}</span>
          </div>

          <div className="grid grid-cols-12 gap-x-2 gap-y-0.5 text-[8.5pt]">
            <div className="col-span-8">
              <span className="font-bold">Nome:</span> <span className="font-extrabold text-[9pt]">{aso.employee.name}</span>
            </div>
            <div className="col-span-4 font-mono">
              <span className="font-bold">CPF:</span> <span className="font-bold">{aso.employee.cpf}</span>
            </div>

            <div className="col-span-4">
              <span className="font-bold">Data Nasc:</span> {formatDateBR(aso.employee.birthDate)} {aso.employee.age ? `(${aso.employee.age} anos)` : ''}
            </div>
            <div className="col-span-4">
              <span className="font-bold">RG:</span> {aso.employee.rg || 'Não informado'}
            </div>
            <div className="col-span-4 font-mono">
              <span className="font-bold">Matrícula:</span> {aso.employee.employeeCode || 'Não informada'}
            </div>

            <div className="col-span-7 mt-0.5">
              <span className="font-bold">Função / Cargo:</span> <span className="font-bold">{aso.employee.role}</span>
            </div>
            <div className="col-span-5 mt-0.5">
              <span className="font-bold">Setor:</span> <span className="font-bold">{aso.employee.department}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Tipo de Exame Médico Ocupacional */}
        <div className="border border-black p-1.5 mb-1.5 bg-slate-50/30">
          <div className="text-[7.5pt] font-black uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-0.5 mb-1">
            3. NATUREZA DO EXAME MÉDICO OCUPACIONAL (NR-7)
          </div>

          <div className="grid grid-cols-5 gap-1 text-center text-[7.5pt]">
            {[
              { id: 'admissional', name: 'ADMISSIONAL' },
              { id: 'periodico', name: 'PERIÓDICO' },
              { id: 'retorno_trabalho', name: 'RETORNO AO TRABALHO' },
              { id: 'mudanca_risco', name: 'MUDANÇA DE RISCOS' },
              { id: 'demissional', name: 'DEMISSIONAL' },
            ].map((t) => {
              const checked = aso.examType === t.id;
              return (
                <div
                  key={t.id}
                  className={`py-1 px-0.5 border ${
                    checked
                      ? 'border-black bg-black text-white font-black'
                      : 'border-slate-300 text-slate-500'
                  }`}
                >
                  <span className="mr-0.5 font-mono font-bold">[{checked ? 'X' : ' '}]</span>
                  <span>{t.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 4: Riscos Ocupacionais & Exames Complementares */}
        <div className="grid grid-cols-12 gap-2 mb-1.5">
          {/* Riscos Ocupacionais (NR-7 Item 7.5.19) */}
          <div className="col-span-6 border border-black p-2">
            <div className="text-[7.5pt] font-black uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-0.5 mb-1 flex justify-between items-center">
              <span>4. RISCOS OCUPACIONAIS AVALIADOS (NR-7)</span>
              <span className="text-[6.5pt] font-mono text-slate-500 font-normal">PGR / NR-7</span>
            </div>

            <div className="text-[7.2pt] space-y-1 min-h-[36px] leading-snug">
              {registeredRisks.map((r, i) => (
                <div key={i} className="flex items-start gap-1">
                  <span className="font-bold text-black shrink-0">• {r.label.toUpperCase()}:</span>
                  <span className="text-slate-800">{r.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Procedimentos Médicos e Complementares */}
          <div className="col-span-6 border border-black p-2">
            <div className="text-[7.5pt] font-black uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-0.5 mb-1 flex justify-between items-center">
              <span>5. EXAMES REALIZADOS</span>
              <span className="text-[6.5pt] font-mono text-slate-500 font-normal">NR-7</span>
            </div>
            <div className="text-[7.5pt] space-y-1 min-h-[36px]">
              {aso.complementaryExams.map((ex, i) => (
                <div key={i} className="flex items-start justify-between gap-2 border-b border-slate-100 pb-0.5 last:border-0">
                  <span className="font-medium text-slate-900 leading-snug break-words">{ex.name}</span>
                  <span className="font-mono text-[7pt] text-slate-700 uppercase shrink-0 whitespace-nowrap text-right pt-0.5">
                    {formatDateBR(ex.date)} ({ex.result})
                  </span>
                </div>
              ))}
              {aso.complementaryExams.length === 0 && (
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-0.5">
                  <span className="font-medium text-slate-900 leading-snug">Avaliação Clínica Ocupacional</span>
                  <span className="font-mono text-[7pt] text-slate-700 uppercase shrink-0 whitespace-nowrap text-right pt-0.5">
                    {formatDateBR(aso.issueDate)} (NORMAL)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section Anamnese Dinâmica & Avaliação Clínica Ocupacional */}
        {showAnamnesisInPrint && (
          <div className="border border-black p-2 mb-1.5 bg-slate-50/20 text-[7.5pt] leading-tight">
            <div className="text-[7.5pt] font-black uppercase tracking-wider text-slate-800 border-b border-black pb-0.5 mb-1 flex justify-between items-center">
              <span>{anamneseSectionNum}. ANAMNESE DINÂMICA & AVALIAÇÃO CLÍNICA OCUPACIONAL</span>
              <span className="text-[6.5pt] text-slate-600 font-mono">
                {blankAnamnesisMode ? 'PREENCHIMENTO NO PAPEL' : 'AVALIAÇÃO MÉDICA PRESENCIAL'}
              </span>
            </div>

            {/* Sinais Vitais & Biometria */}
            <div className="grid grid-cols-12 gap-1 pb-1 mb-1 border-b border-slate-300 text-[7.5pt] items-center">
              <div className="col-span-3">
                <span className="font-bold">PA:</span>{' '}
                {aso.anamnesis.bloodPressure && !blankAnamnesisMode ? (
                  <span className="font-mono font-bold">{aso.anamnesis.bloodPressure} mmHg</span>
                ) : (
                  <span className="font-mono">____/____ mmHg</span>
                )}
              </div>
              <div className="col-span-2">
                <span className="font-bold">FC:</span>{' '}
                {aso.anamnesis.heartRate && !blankAnamnesisMode ? (
                  <span className="font-mono font-bold">{aso.anamnesis.heartRate} bpm</span>
                ) : (
                  <span className="font-mono">____ bpm</span>
                )}
              </div>
              <div className="col-span-3 flex flex-col justify-center leading-tight">
                <div>
                  <span className="font-bold">Peso:</span>{' '}
                  {aso.anamnesis.weight && !blankAnamnesisMode ? (
                    <span className="font-mono">{aso.anamnesis.weight} kg</span>
                  ) : (
                    <span className="font-mono">____ kg</span>
                  )}
                </div>
                <div className="mt-0.5">
                  <span className="font-bold">Altura:</span>{' '}
                  {aso.anamnesis.height && !blankAnamnesisMode ? (
                    <span className="font-mono">{aso.anamnesis.height} cm</span>
                  ) : (
                    <span className="font-mono">____ cm</span>
                  )}
                </div>
              </div>
              <div className="col-span-4 flex flex-col justify-center leading-tight">
                <div>
                  <span className="font-bold">Estado Geral:</span>{' '}
                  <span className="font-mono whitespace-nowrap text-[7pt]">
                    [{!blankAnamnesisMode && aso.anamnesis.generalCondition === 'bom' ? 'X' : ' '}] Bom&nbsp;[{!blankAnamnesisMode && aso.anamnesis.generalCondition === 'regular' ? 'X' : ' '}] Reg&nbsp;[{!blankAnamnesisMode && aso.anamnesis.generalCondition === 'alterado' ? 'X' : ' '}] Alt
                  </span>
                </div>
              </div>
            </div>

            {/* Hábitos & Histórico */}
            <div className="space-y-0.5 text-[7.5pt] mb-1">
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold shrink-0 min-w-[130px]">Queixas Atuais:</span>
                {aso.anamnesis.currentComplaints && !blankAnamnesisMode ? (
                  <span className="text-slate-800 flex-1">{aso.anamnesis.currentComplaints}</span>
                ) : (
                  <span className="flex-1 border-b border-dotted border-black h-3" />
                )}
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="font-bold shrink-0 min-w-[130px]">Medicação Contínua:</span>
                {aso.anamnesis.continuousMedication && !blankAnamnesisMode ? (
                  <span className="text-slate-800 flex-1">{aso.anamnesis.continuousMedication}</span>
                ) : (
                  <span className="flex-1 border-b border-dotted border-black h-3" />
                )}
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="font-bold shrink-0 min-w-[130px]">Cirurgias / Internações:</span>
                {aso.anamnesis.previousSurgeries && !blankAnamnesisMode ? (
                  <span className="text-slate-800 flex-1">{aso.anamnesis.previousSurgeries}</span>
                ) : (
                  <span className="flex-1 border-b border-dotted border-black h-3" />
                )}
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="font-bold shrink-0 min-w-[130px]">Doenças Crônicas:</span>
                {aso.anamnesis.chronicDiseases &&
                aso.anamnesis.chronicDiseases.some((d) => d && d.trim() !== '') &&
                !blankAnamnesisMode ? (
                  <span className="text-slate-800 flex-1 font-semibold">
                    {aso.anamnesis.chronicDiseases.filter((d) => d && d.trim() !== '').join(', ')}
                  </span>
                ) : (
                  <span className="flex-1 border-b border-dotted border-black h-3" />
                )}
              </div>

              <div className="flex items-baseline gap-1.5 pt-0.5">
                <span className="font-bold shrink-0 min-w-[130px]">Hábitos de Vida:</span>
                {blankAnamnesisMode ? (
                  <span className="font-mono text-[7pt]">
                    Tabagismo: [ ] Sim  [ ] Não&nbsp;&nbsp;•&nbsp;&nbsp;Etilismo: [ ] Sim  [ ] Não
                  </span>
                ) : (
                  <span>
                    Tabagismo: {aso.anamnesis.smoker ? `Sim (${aso.anamnesis.smokerDetails || 'ativo'})` : 'Não'} •{' '}
                    Etilismo: {aso.anamnesis.alcohol ? `Sim (${aso.anamnesis.alcoholDetails || 'social'})` : 'Não'}
                  </span>
                )}
              </div>
            </div>

            {/* Exame Físico / Avaliação Médica Dirigida */}
            <div className="pt-0.5 border-t border-slate-300 text-[7.5pt]">
              <span className="font-bold">Avaliação Clínica / Exame Físico:</span>{' '}
              {aso.anamnesis.clinicalObservations && !blankAnamnesisMode ? (
                <span className="text-slate-800">{aso.anamnesis.clinicalObservations}</span>
              ) : (
                <div className="mt-0.5 space-y-1">
                  <div className="border-b border-dotted border-black w-full h-2.5" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section Conclusão Médica / Parecer Ocupacional (NR-7) */}
        <div className="border-2 border-black p-2 mb-1.5 bg-slate-50/40">
          <div className="text-[7.5pt] font-black uppercase tracking-wider text-slate-900 border-b border-black pb-0.5 mb-1 flex items-center justify-between gap-2">
            <span className="truncate">{conclusaoSectionNum}. CONCLUSÃO MÉDICA OCUPACIONAL (NR-7)</span>
            <span className="text-[6.5pt] font-mono font-bold text-slate-600 uppercase shrink-0 whitespace-nowrap">
              {isEmBranco ? 'PREENCHIMENTO MANUSCRITO NO PAPEL' : 'PARECER TÉCNICO CONCLUSIVO'}
            </span>
          </div>

          {/* Três colunas uniformes com largura total (w-full) evitando quebra de linha */}
          <div className="grid grid-cols-3 gap-2 w-full my-0.5">
            
            {/* Box APTO */}
            <div
              className={`col-span-1 flex items-center justify-center gap-1.5 py-1.5 px-1 border-2 text-center select-none ${
                isApto
                  ? 'border-black bg-black text-white font-black'
                  : isEmBranco
                  ? 'border-black bg-white text-black font-bold'
                  : 'border-slate-300 text-slate-400 opacity-60'
              }`}
            >
              <span className="font-mono font-bold text-[10pt] shrink-0">[{isApto ? 'X' : '  '}]</span>
              <span className="uppercase tracking-wider font-extrabold text-[8pt] whitespace-nowrap">
                APTO PARA A FUNÇÃO
              </span>
            </div>

            {/* Box INAPTO */}
            <div
              className={`col-span-1 flex items-center justify-center gap-1.5 py-1.5 px-1 border-2 text-center select-none ${
                isInapto
                  ? 'border-black bg-black text-white font-black'
                  : isEmBranco
                  ? 'border-black bg-white text-black font-bold'
                  : 'border-slate-300 text-slate-400 opacity-60'
              }`}
            >
              <span className="font-mono font-bold text-[10pt] shrink-0">[{isInapto ? 'X' : '  '}]</span>
              <span className="uppercase tracking-wider font-extrabold text-[8pt] whitespace-nowrap">
                INAPTO PARA A FUNÇÃO
              </span>
            </div>

            {/* Box APTO COM RESTRIÇÃO */}
            <div
              className={`col-span-1 flex items-center justify-center gap-1.5 py-1.5 px-1 border-2 text-center select-none ${
                isComRestricao
                  ? 'border-black bg-black text-white font-black'
                  : isEmBranco
                  ? 'border-black bg-white text-black font-bold'
                  : 'border-slate-300 text-slate-400 opacity-60'
              }`}
            >
              <span className="font-mono font-bold text-[10pt] shrink-0">[{isComRestricao ? 'X' : '  '}]</span>
              <span className="uppercase tracking-wider font-extrabold text-[8pt] whitespace-nowrap">
                APTO COM RESTRIÇÃO
              </span>
            </div>
          </div>

          {isComRestricao && aso.restrictionsNote && (
            <div className="mt-1 text-[7.5pt] p-1 bg-white border border-black">
              <span className="font-bold">Restrições Ocupacionais:</span> {aso.restrictionsNote}
            </div>
          )}

          {isEmBranco ? (
            <div className="mt-1 pt-1 border-t border-dashed border-black text-[7.5pt]">
              <div className="flex justify-between items-center mb-0.5 text-[7pt] font-bold text-slate-800">
                <span>RESTRIÇÕES / OBSERVAÇÕES CLÍNICAS OCUPACIONAIS (MANUSCRITO):</span>
                <span className="text-[6.5pt] font-mono text-slate-500">(À caneta)</span>
              </div>
              <div className="space-y-1 pt-0.5">
                <div className="border-b border-dotted border-black h-3 w-full" />
                <div className="border-b border-dotted border-black h-3 w-full" />
              </div>
            </div>
          ) : (
            aso.notes && (
              <div className="mt-1 text-[7.5pt] text-slate-700">
                <span className="font-bold">Observações:</span> {aso.notes}
              </div>
            )
          )}
        </div>

        {/* Section 8: Data e Assinaturas Estruturadas (Com linhas pontilhadas) */}
        <div className="border border-black p-2 bg-white signatures-section break-inside-avoid">
          <div className="text-right text-[8.5pt] font-semibold text-slate-800 mb-1.5">
            {formatLongDate(aso.issueDate, aso.issueCity)}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            
            {/* Assinatura do Médico Examinador */}
            <div className="text-center">
              <div className="border-b border-dashed border-black w-4/5 mx-auto mb-1 h-7 flex items-end justify-center">
                {/* Visual guideline for physical rubber stamp / signature */}
                <span className="text-[6.5pt] text-slate-400 uppercase tracking-widest no-print">
                  (Espaço para Carimbo e Assinatura)
                </span>
              </div>
              <p className="font-bold text-[9pt] text-black uppercase leading-tight">
                {aso.doctor.name || 'Médico Examinador'}
              </p>
              <p className="text-[7.5pt] font-mono text-slate-800">
                {aso.doctor.crm ? `CRM ${aso.doctor.crm}${aso.doctor.crmUf ? `/${aso.doctor.crmUf}` : ''}` : 'CRM: ______________'} {aso.doctor.rqe ? `• RQE ${aso.doctor.rqe}` : ''}
              </p>
              <p className="text-[7pt] font-semibold text-slate-600 uppercase">
                Médico Examinador {aso.doctor.specialty ? `• ${aso.doctor.specialty}` : ''}
              </p>
            </div>

            {/* Assinatura e Ciência do Colaborador */}
            <div className="text-center">
              <div className="border-b border-dashed border-black w-4/5 mx-auto mb-1 h-7 flex items-end justify-center">
                <span className="text-[6.5pt] text-slate-400 uppercase tracking-widest no-print">
                  (Assinatura do Empregado)
                </span>
              </div>
              <p className="font-bold text-[9pt] text-black uppercase leading-tight">
                {aso.employee.name}
              </p>
              <p className="text-[7.5pt] font-mono text-slate-800">
                CPF: {aso.employee.cpf}
              </p>
              <p className="text-[6.5pt] text-slate-500 leading-tight">
                Declaro que fui informado dos resultados e recebi a 2ª via deste ASO.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

  const renderQuestionnaireAnnexSheet = () => {
    return (
      <div
        className={`annex-sheet bg-white text-black max-w-[210mm] mx-auto text-[9pt] leading-tight font-sans relative ${
          useTimbrado
            ? 'with-timbrado shadow-xl pt-[28mm] pb-[12mm] px-8 border-0'
            : 'border border-slate-900 rounded-none shadow-md p-6 sm:p-8'
        }`}
      >
        {useTimbrado && (
          <div className="timbrado-layer absolute inset-0 pointer-events-none select-none z-0">
            <img
              src={DEFAULT_TIMBRADO_URL}
              alt="Papel Timbrado Sales & Dourado"
              className="w-full h-full object-fill pointer-events-none select-none"
              referrerPolicy="no-referrer"
              onError={(e) => {
                if (e.currentTarget.src !== REMOTE_TIMBRADO_FALLBACK) {
                  e.currentTarget.src = REMOTE_TIMBRADO_FALLBACK;
                }
              }}
            />
          </div>
        )}

        <div className="aso-sheet-content relative z-10 flex flex-col justify-between h-full">
          <div>
            {/* Header Anexo */}
            <div className="border-b-2 border-black pb-1 mb-1.5 mt-[0.5cm]">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[12pt] font-black tracking-tight text-black uppercase">
                    ANEXO I • QUESTIONÁRIO CLÍNICO-OCUPACIONAL (NR-7)
                  </h2>
                  <span className="text-[7pt] font-semibold text-slate-600 block mt-0.5">
                    Ficha de Anamnese Dirigida • Prontuário Médico Confidencial (Res. CFM nº 1.638/2002 e Portaria MTP nº 6.734/2021)
                  </span>
                </div>
                <div className="text-right pl-3 shrink-0">
                  <span className="inline-block border-2 border-black px-2 py-0.5 text-[7.5pt] font-black tracking-wider uppercase bg-slate-100">
                    ANEXO AO ASO
                  </span>
                  <span className="block text-[7pt] font-mono font-semibold text-slate-800 mt-0.5">
                    {aso.asoCode}
                  </span>
                </div>
              </div>
            </div>

            {/* Faixa Resumo Identificação */}
            <div className="border border-black p-1.5 mb-1.5 bg-slate-50/50 text-[7.5pt]">
              <div className="grid grid-cols-12 gap-x-2">
                <div className="col-span-6">
                  <span className="font-bold">Colaborador:</span> {aso.employee.name}
                </div>
                <div className="col-span-3 font-mono">
                  <span className="font-bold">CPF:</span> {aso.employee.cpf}
                </div>
                <div className="col-span-3">
                  <span className="font-bold">Função:</span> {aso.employee.role}
                </div>
                <div className="col-span-6 mt-0.5">
                  <span className="font-bold">Empresa:</span> {aso.company.name}
                </div>
                <div className="col-span-3 mt-0.5">
                  <span className="font-bold">Tipo Exame:</span> {EXAM_TYPE_LABELS[aso.examType]?.label || aso.examType}
                </div>
                <div className="col-span-3 mt-0.5">
                  <span className="font-bold">Data:</span> {formatDateBR(aso.issueDate)}
                </div>
              </div>
            </div>

            {/* Categorias e Perguntas do Questionário */}
            <div className="grid grid-cols-2 gap-1.5 text-[6.5pt] leading-tight">
              {printableCategories.map((cat) => (
                <div key={cat.id} className="border border-slate-400 p-1.5 bg-white">
                  <div className="font-bold text-[7pt] uppercase text-black border-b border-slate-300 pb-0.5 mb-1 flex justify-between items-center">
                    <span>{cat.title}</span>
                    <span className="text-[6pt] font-mono text-slate-600 font-normal">
                      ({cat.questions.length})
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {cat.questions.map((q) => {
                      const isSim = q.answer === 'sim';
                      const isNao = q.answer === 'nao';

                      return (
                        <div key={q.id} className="leading-snug">
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-slate-900 flex-1">{q.text}</span>
                            <span className="font-mono font-bold shrink-0 text-[6.5pt] text-black">
                              ({isSim ? 'X' : ' '}) Sim ({isNao ? 'X' : ' '}) Não
                            </span>
                          </div>
                          {q.hasDetail && (
                            <div className="text-[6pt] text-slate-700 font-mono pl-1 border-l border-black mt-0.5">
                              <span className="font-bold">{q.detailLabel || 'Especificação:'}</span>{' '}
                              {q.detailValue ? (
                                q.detailValue
                              ) : (
                                <span className="inline-block border-b border-dotted border-black w-32 h-2 align-bottom" />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rodapé do Questionário Clínico-Ocupacional (Sem assinaturas por solicitação) */}
          <div className="border border-black p-2 bg-white mt-2 break-inside-avoid">
            <div className="flex flex-wrap items-center justify-between text-[6.5pt] text-slate-700">
              <span className="italic">
                Documento anexo de preenchimento clínico integrante do prontuário ocupacional (NR-7). As assinaturas formais constam nas vias oficiais do ASO.
              </span>
              <span className="font-mono font-semibold text-slate-800">
                Data do Registro: {formatDateBR(aso.issueDate)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

return (
  <div className="print-container space-y-6 pb-24">
    
    {/* Floating Action Controls (Hidden automatically during print) */}
    <div className="no-print bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 sticky top-16 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onBackToEdit}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Formulário
        </button>

        <div>
          <span className="text-[10px] text-slate-400 block font-mono">
            Visualização de Impressão A4
          </span>
          <span className="text-sm font-bold text-white flex items-center gap-2">
            {aso.asoCode} - {aso.employee.name}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Toggle Papel Timbrado Sales & Dourado */}
        <label
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all select-none shadow-sm ${
            useTimbrado
              ? 'bg-blue-600/30 text-blue-200 border border-blue-400/60 ring-1 ring-blue-500/40'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
          title="Ativa ou desativa o papel timbrado de fundo (Sales & Dourado)"
        >
          <input
            type="checkbox"
            checked={useTimbrado}
            onChange={(e) => {
              const val = e.target.checked;
              setUseTimbrado(val);
              setTimbradoConfig({ ...getTimbradoConfig(), enabled: val });
            }}
            className="rounded text-blue-500 focus:ring-blue-400 h-4 w-4"
          />
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-300" />
            Timbrado: Sales & Dourado
          </span>
        </label>

        {/* Toggle Two Copies (1ª Via Empresa + 2ª Via Colaborador) */}
        <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 cursor-pointer hover:bg-slate-700 transition-colors select-none">
          <input
            type="checkbox"
            checked={printTwoCopies}
            onChange={(e) => setPrintTwoCopies(e.target.checked)}
            className="rounded text-teal-500 focus:ring-teal-400 h-4 w-4"
          />
          <span>Via do Trabalhador (3ª Folha)</span>
        </label>

        {/* Primary Action: PRINT / SAVE PDF */}
        <button
          onClick={handlePrint}
          className="btn-print inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs shadow-lg hover:shadow-xl transition-all cursor-pointer ring-2 ring-teal-400/50"
          title="Abre a caixa de impressão do navegador para impressora física ou Salvar em PDF"
        >
          <Printer className="w-4 h-4 text-white" />
          Imprimir / Salvar PDF
        </button>
      </div>
    </div>

    {/* Print Notice (e.g. if iframe blocks direct window.print) */}
    {printNotice && (
      <div className="no-print p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium flex items-center justify-between gap-3 shadow-xs animate-fade-in">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{printNotice}</span>
        </div>
        <button
          type="button"
          onClick={() => setPrintNotice('')}
          className="px-3 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-900 text-xs font-semibold"
        >
          Fechar
        </button>
      </div>
    )}

      {/* Folha 1: 1ª VIA - EMPRESA */}
      <div className="aso-print-wrapper">
        <div className="no-print mb-2 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-200 px-3 py-1 rounded-full">
            1ª Folha / 1ª Via (Empresa)
          </span>
        </div>
        {renderSingleASOSheet('1ª VIA - EMPRESA')}
      </div>

      {/* Folha 2: ANEXO I • QUESTIONÁRIO CLÍNICO-OCUPACIONAL (NR-7) */}
      {hasPrintableQuestions && showQuestionnaireInPrint && (
        <div className="aso-print-wrapper mt-8">
          <div className="no-print my-4 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-200 px-3 py-1 rounded-full">
              2ª Folha / Anexo I • Questionário Clínico-Ocupacional (NR-7)
            </span>
          </div>
          {renderQuestionnaireAnnexSheet()}
        </div>
      )}

      {/* Folha 3: 2ª VIA - TRABALHADOR */}
      {printTwoCopies && (
        <div className="aso-print-wrapper mt-8">
          <div className="no-print my-4 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-200 px-3 py-1 rounded-full">
              {hasPrintableQuestions && showQuestionnaireInPrint ? '3ª Folha / 2ª Via (Trabalhador)' : '2ª Folha / 2ª Via (Trabalhador)'}
            </span>
          </div>
          {renderSingleASOSheet('2ª VIA - TRABALHADOR')}
        </div>
      )}
    </div>
  );
};
