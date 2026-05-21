import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Flower, 
  Users, 
  LayoutDashboard, 
  LogOut, 
  ArrowLeft,
  Plus,
  MessageSquare,
  Mail,
  Calendar,
  TrendingUp,
  Save,
  CheckCircle,
  FileText,
  X,
  ChevronRight
} from 'lucide-react';

interface Paciente {
  id: string;
  nome: string;
  data_nascimento: string | null;
  sexo: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  
  horario_acorda: string | null;
  horario_dorme: string | null;
  litros_agua: number | null;
  refeicoes_por_dia: number | null;
  atividade_fisica: boolean;
  atividade_fisica_descricao: string | null;
  
  peso_inicial: number | null;
  altura: number | null;
  nivel_atividade: string | null;
  objetivos: string[] | null;
  objetivo_texto: string | null;
  
  patologias: string[] | null;
  restricoes_alimentares: string[] | null;
  alergias: string[] | null;
  medicamentos: string | null;
  suplementos: string | null;
  observacoes: string | null;
  created_at?: string;
}

interface Consulta {
  id: string;
  data_consulta: string;
  peso: number | null;
  cintura: number | null;
  quadril: number | null;
  percentual_gordura: number | null;
  observacoes: string | null;
  proximo_retorno: string | null;
}

interface PlanoAlimentar {
  id: string;
  paciente_id: string;
  conteudo: any;
  created_at: string;
}

const PatientProfile: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Estados principais
  const [patient, setPatient] = useState<Paciente | null>(null);
  const [consultations, setConsultations] = useState<Consulta[]>([]);
  const [foodPlans, setFoodPlans] = useState<PlanoAlimentar[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de feedback
  const [savingPatient, setSavingPatient] = useState<boolean>(false);
  const [savingConsultation, setSavingConsultation] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [consultationSuccessMessage, setConsultationSuccessMessage] = useState<string | null>(null);

  // Abas da Seção 1 (Dados do Paciente)
  const [activeDataTab, setActiveDataTab] = useState<'pessoal' | 'clinico' | 'habitos'>('pessoal');

  // Estados do formulário da Seção 1
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  
  const [pesoInicial, setPesoInicial] = useState('');
  const [altura, setAltura] = useState('');
  const [nivelAtividade, setNivelAtividade] = useState('Sedentário');
  const [objetivos, setObjetivos] = useState<string[]>([]);
  const [inputObjetivo, setInputObjetivo] = useState('');
  const [objetivoTexto, setObjetivoTexto] = useState('');
  
  const [patologias, setPatologias] = useState<string[]>([]);
  const [inputPatologia, setInputPatologia] = useState('');
  
  const [restricoesAlimentares, setRestricoesAlimentares] = useState<string[]>([]);
  const [inputRestricao, setInputRestricao] = useState('');
  
  const [alergias, setAlergias] = useState<string[]>([]);
  const [inputAlergia, setInputAlergia] = useState('');
  
  const [medicamentos, setMedicamentos] = useState('');
  const [suplementos, setSuplementos] = useState('');
  
  const [refeicoesPorDia, setRefeicoesPorDia] = useState('');
  const [horarioAcorda, setHorarioAcorda] = useState('');
  const [horarioDorme, setHorarioDorme] = useState('');
  const [litrosAgua, setLitrosAgua] = useState('');
  const [atividadeFisica, setAtividadeFisica] = useState(false);
  const [atividadeFisicaDescricao, setAtividadeFisicaDescricao] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Estados do Modal "Nova Consulta" (Seção 2)
  const [isNewConsultationModalOpen, setIsNewConsultationModalOpen] = useState(false);
  const [cDataConsulta, setCDataConsulta] = useState('');
  const [cPeso, setCPeso] = useState('');
  const [cCintura, setCCintura] = useState('');
  const [cQuadril, setCQuadril] = useState('');
  const [cPercentualGordura, setCPercentualGordura] = useState('');
  const [cObservacoes, setCObservacoes] = useState('');
  const [cProximoRetorno, setCProximoRetorno] = useState('');

  // Estado para ver detalhes de um plano alimentar (Seção 3)
  const [selectedFoodPlan, setSelectedFoodPlan] = useState<PlanoAlimentar | null>(null);

  // Presets para tags
  const presetObjetivos = [
    'Emagrecer', 
    'Ganhar massa', 
    'Controlar diabetes', 
    'Saúde geral', 
    'Performance esportiva', 
    'Reeducação alimentar'
  ];
  
  const presetPatologias = [
    'Diabetes', 
    'Hipertensão', 
    'Hipotireoidismo', 
    'Hipertireoidismo', 
    'Síndrome do ovário policístico', 
    'Doença celíaca', 
    'Colesterol alto'
  ];
  
  const presetRestricoes = [
    'Lactose', 
    'Glúten', 
    'Açúcar', 
    'Carne vermelha', 
    'Frutos do mar'
  ];
  
  const presetAlergias = [
    'Amendoim', 
    'Leite', 
    'Ovo', 
    'Soja', 
    'Trigo', 
    'Frutos do mar'
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    }
  };

  const fetchPatientProfile = async () => {
    if (!id || !user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Buscar Paciente
      const { data: pData, error: pError } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .single();

      if (pError) throw pError;
      setPatient(pData);

      // 2. Buscar Consultas
      const { data: cData, error: cError } = await supabase
        .from('consultas')
        .select('*')
        .eq('paciente_id', id)
        .order('data_consulta', { ascending: false });

      if (cError) throw cError;
      setConsultations(cData || []);

      // 3. Buscar Planos Alimentares
      const { data: paData, error: paError } = await supabase
        .from('planos_alimentares')
        .select('*')
        .eq('paciente_id', id)
        .order('created_at', { ascending: false });

      if (paError) throw paError;
      setFoodPlans(paData || []);

    } catch (err: any) {
      console.error('Erro ao carregar perfil:', err);
      setError('Erro ao carregar prontuário do paciente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientProfile();
  }, [id, user]);

  // Preencher estados do formulário quando os dados do paciente mudarem
  useEffect(() => {
    if (patient) {
      setNome(patient.nome || '');
      setDataNascimento(patient.data_nascimento || '');
      setSexo(patient.sexo || '');
      setTelefone(patient.telefone || '');
      setWhatsapp(patient.whatsapp || '');
      setEmail(patient.email || '');
      
      setPesoInicial(patient.peso_inicial !== null ? String(patient.peso_inicial) : '');
      setAltura(patient.altura !== null ? String(patient.altura) : '');
      setNivelAtividade(patient.nivel_atividade || 'Sedentário');
      setObjetivos(patient.objetivos || []);
      setObjetivoTexto(patient.objetivo_texto || '');
      
      setPatologias(patient.patologias || []);
      setRestricoesAlimentares(patient.restricoes_alimentares || []);
      setAlergias(patient.alergias || []);
      setMedicamentos(patient.medicamentos || '');
      setSuplementos(patient.suplementos || '');
      
      setRefeicoesPorDia(patient.refeicoes_por_dia !== null ? String(patient.refeicoes_por_dia) : '');
      setHorarioAcorda(patient.horario_acorda || '');
      setHorarioDorme(patient.horario_dorme || '');
      setLitrosAgua(patient.litros_agua !== null ? String(patient.litros_agua) : '');
      setAtividadeFisica(!!patient.atividade_fisica);
      setAtividadeFisicaDescricao(patient.atividade_fisica_descricao || '');
      setObservacoes(patient.observacoes || '');
    }
  }, [patient]);

  // Cálculo da idade
  const calculateAge = (dateString: string | null) => {
    if (!dateString) return '-';
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} anos`;
  };

  // Formatar IMC
  const getIMC = (peso: number | null | string, altura: number | null | string) => {
    const p = typeof peso === 'string' ? parseFloat(peso) : peso;
    const a = typeof altura === 'string' ? parseFloat(altura) : altura;
    if (!p || !a) return '-';
    const heightInMeters = a > 3 ? a / 100 : a;
    return (p / (heightInMeters * heightInMeters)).toFixed(2);
  };

  // Iniciais para avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Link do WhatsApp
  const formatWhatsAppUrl = (phone: string | null) => {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${finalPhone}`;
  };

  // Conversão de horário
  const formatHourString = (value: string): string => {
    const clean = value.replace(/\D/g, '');
    if (!clean) return '';
    const num = parseInt(clean, 10);
    if (isNaN(num)) return '';
    
    if (clean.length <= 2) {
      if (num >= 0 && num <= 23) {
        return `${String(num).padStart(2, '0')}:00`;
      }
      return '';
    }
    
    if (clean.length === 3 || clean.length === 4) {
      const minutes = num % 100;
      const hours = Math.floor(num / 100);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
    }
    return value;
  };

  const handleHourBlur = (
    value: string,
    setValue: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const formatted = formatHourString(value);
    if (formatted) {
      setValue(formatted);
    }
  };

  // Controle de tags
  const handleTagToggle = (
    tag: string,
    currentTags: string[],
    setCurrentTags: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (tag === 'Nenhum') {
      setCurrentTags(['Nenhum']);
    } else {
      const filtered = currentTags.filter(t => t !== 'Nenhum');
      if (filtered.includes(tag)) {
        setCurrentTags(filtered.filter(t => t !== tag));
      } else {
        setCurrentTags([...filtered, tag]);
      }
    }
  };

  const addCustomTag = (
    tag: string,
    currentTags: string[],
    setCurrentTags: React.Dispatch<React.SetStateAction<string[]>>,
    setInputField: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const clean = tag.trim();
    if (clean) {
      const filtered = currentTags.filter(t => t !== 'Nenhum');
      if (!filtered.includes(clean)) {
        setCurrentTags([...filtered, clean]);
      }
      setInputField('');
    }
  };

  const removeTag = (
    tag: string,
    currentTags: string[],
    setCurrentTags: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setCurrentTags(currentTags.filter(t => t !== tag));
  };

  // Lógica para salvar os Dados do Paciente (Seção 1)
  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;

    if (!nome.trim()) {
      setError('O nome completo do paciente é obrigatório.');
      return;
    }

    setSavingPatient(true);
    setError(null);
    setSuccessMessage(null);

    const payload = {
      nome: nome.trim(),
      data_nascimento: dataNascimento || null,
      sexo: sexo || null,
      telefone: telefone.trim() || null,
      whatsapp: whatsapp.trim() || null,
      email: email.trim() || null,
      
      peso_inicial: pesoInicial ? parseFloat(pesoInicial) : null,
      altura: altura ? parseFloat(altura) : null,
      nivel_atividade: nivelAtividade || null,
      objetivos: objetivos.length > 0 ? objetivos : null,
      objetivo_texto: objetivoTexto.trim() || null,
      
      patologias: patologias.length > 0 ? patologias : null,
      restricoes_alimentares: restricoesAlimentares.length > 0 ? restricoesAlimentares : null,
      alergias: alergias.length > 0 ? alergias : null,
      medicamentos: medicamentos.trim() || null,
      suplementos: suplementos.trim() || null,
      
      refeicoes_por_dia: refeicoesPorDia ? parseInt(refeicoesPorDia, 10) : null,
      horario_acorda: horarioAcorda || null,
      horario_dorme: horarioDorme || null,
      litros_agua: litrosAgua ? parseFloat(litrosAgua) : null,
      atividade_fisica: atividadeFisica,
      atividade_fisica_descricao: atividadeFisica ? atividadeFisicaDescricao.trim() : null,
      observacoes: observacoes.trim() || null
    };

    try {
      const { error: dbError } = await supabase
        .from('pacientes')
        .update(payload)
        .eq('id', id);

      if (dbError) throw dbError;

      setPatient(prev => prev ? { ...prev, ...payload } : null);
      setSuccessMessage('Alterações salvas com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar paciente:', err);
      setError(err.message || 'Erro ao salvar os dados do paciente.');
    } finally {
      setSavingPatient(false);
    }
  };

  // Abrir modal de consulta pré-preenchido
  const openNewConsultationModal = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setCDataConsulta(todayStr);
    setCPeso('');
    setCCintura('');
    setCQuadril('');
    setCPercentualGordura('');
    setCObservacoes('');
    setCProximoRetorno('');
    setIsNewConsultationModalOpen(true);
  };

  // Lógica para salvar nova consulta (Seção 2)
  const handleSaveConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!cDataConsulta) {
      setError('A data da consulta é obrigatória.');
      return;
    }

    if (!cPeso) {
      setError('O peso atual é obrigatório.');
      return;
    }

    setSavingConsultation(true);
    setError(null);

    const payload = {
      paciente_id: id,
      data_consulta: cDataConsulta,
      peso: cPeso ? parseFloat(cPeso) : null,
      cintura: cCintura ? parseFloat(cCintura) : null,
      quadril: cQuadril ? parseFloat(cQuadril) : null,
      percentual_gordura: cPercentualGordura ? parseFloat(cPercentualGordura) : null,
      observacoes: cObservacoes.trim() || null,
      proximo_retorno: cProximoRetorno || null
    };

    try {
      const { error: dbError } = await supabase
        .from('consultas')
        .insert([payload]);

      if (dbError) throw dbError;

      setConsultationSuccessMessage('Consulta registrada com sucesso!');
      setIsNewConsultationModalOpen(false);
      
      // Recarregar os dados do prontuário
      await fetchPatientProfile();
      
      setTimeout(() => setConsultationSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao registrar consulta:', err);
      setError(err.message || 'Erro ao registrar a consulta.');
    } finally {
      setSavingConsultation(false);
    }
  };

  // Render do gráfico em SVG
  const renderWeightChart = () => {
    const chartData = [...consultations]
      .filter(c => c.peso !== null && c.peso !== undefined)
      .sort((a, b) => new Date(a.data_consulta).getTime() - new Date(b.data_consulta).getTime());

    // Se tiver dados iniciais de peso no prontuário, também podemos incluir se não houver consultas
    if (chartData.length === 0 && patient?.peso_inicial) {
      chartData.push({
        id: 'initial',
        data_consulta: patient.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        peso: patient.peso_inicial,
        cintura: null,
        quadril: null,
        percentual_gordura: null,
        observacoes: 'Peso Inicial Cadastrado',
        proximo_retorno: null
      });
    }

    if (chartData.length === 0) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '220px',
          border: '2px dashed var(--border-color)',
          borderRadius: '16px',
          color: 'var(--text-secondary)',
          background: '#fafafa'
        }}>
          <TrendingUp size={36} style={{ opacity: 0.4, marginBottom: '8px' }} />
          <span style={{ fontSize: '0.95rem', fontStyle: 'italic' }}>Nenhuma consulta registrada ainda</span>
        </div>
      );
    }

    const width = 600;
    const height = 220;
    const paddingLeft = 50;
    const paddingRight = 40;
    const paddingTop = 25;
    const paddingBottom = 40;

    const weights = chartData.map(d => Number(d.peso));
    const maxWeight = Math.max(...weights);
    const minWeight = Math.min(...weights);
    const weightRange = maxWeight - minWeight;

    // Ajustar margens do Y para ficar bonito no gráfico
    const yMax = maxWeight + (weightRange > 0 ? weightRange * 0.15 : 10);
    const yMin = Math.max(0, minWeight - (weightRange > 0 ? weightRange * 0.15 : 10));
    const yRange = yMax - yMin;

    const points = chartData.map((d, index) => {
      const x = chartData.length > 1
        ? paddingLeft + (index * (width - paddingLeft - paddingRight) / (chartData.length - 1))
        : width / 2;
        
      const y = height - paddingBottom - (((Number(d.peso) - yMin) / yRange) * (height - paddingTop - paddingBottom));
      
      return { 
        x, 
        y, 
        weight: d.peso, 
        date: new Date(d.data_consulta + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) 
      };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
      : '';

    return (
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: '500px', height: 'auto', display: 'block' }}>
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--primary-color)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Linhas de Grade Horizontal */}
          {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
            const y = paddingTop + r * (height - paddingTop - paddingBottom);
            const val = (yMax - r * yRange).toFixed(1);
            return (
              <g key={i}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--border-color)" strokeDasharray="4 4" />
                <text x={paddingLeft - 10} y={y + 4} fontSize="10" fill="var(--text-secondary)" textAnchor="end">{val} kg</text>
              </g>
            );
          })}

          {/* Área de Gradiente */}
          {areaPath && <path d={areaPath} fill="url(#chartGrad)" />}

          {/* Linha da Evolução */}
          {linePath && <path d={linePath} stroke="var(--primary-color)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />}

          {/* Pontos de Dados */}
          {points.map((p, i) => (
            <g key={i}>
              {/* Efeito de Glow */}
              <circle cx={p.x} cy={p.y} r="8" fill="var(--primary-color)" opacity="0.15" />
              {/* Círculo Principal */}
              <circle cx={p.x} cy={p.y} r="5" fill="var(--primary-color)" stroke="white" strokeWidth="2" />
              {/* Label de Peso */}
              <text x={p.x} y={p.y - 12} fontSize="11" fontWeight="700" fill="var(--primary-color)" textAnchor="middle">{p.weight} kg</text>
              {/* Label de Data */}
              <text x={p.x} y={height - 15} fontSize="11" fill="var(--text-secondary)" textAnchor="middle">{p.date}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  // Render do conteúdo detalhado de um plano alimentar
  const renderPlanoConteudo = (conteudo: any) => {
    if (!conteudo) return '-';
    
    // Se for string simples
    if (typeof conteudo === 'string') {
      return <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.95rem', color: 'var(--text-color)' }}>{conteudo}</pre>;
    }
    
    // Se tiver array de refeições estruturado
    if (conteudo.refeicoes && Array.isArray(conteudo.refeicoes)) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {conteudo.refeicoes.map((ref: any, idx: number) => (
            <div key={idx} style={{ padding: '16px', backgroundColor: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h5 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{ref.nome}</span>
                {ref.horario && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>{ref.horario}</span>}
              </h5>
              <p style={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap', color: 'var(--text-color)' }}>{ref.alimentos}</p>
              {ref.observacoes && (
                <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  Obs: {ref.observacoes}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Fallback: renderizar como JSON formatado
    return (
      <pre style={{
        whiteSpace: 'pre-wrap',
        fontFamily: 'monospace',
        fontSize: '0.85rem',
        backgroundColor: '#fafafa',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        {JSON.stringify(conteudo, null, 2)}
      </pre>
    );
  };

  return (
    <div className="dashboard-layout">
      {/* Menu Lateral Fixo */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-logo">
            <Flower className="logo-flower" />
            Nutri_Berto
          </h1>
        </div>
        
        <nav className="sidebar-menu">
          <button onClick={() => navigate('/dashboard')} className="sidebar-item-btn">
            <LayoutDashboard />
            Dashboard
          </button>
          
          <button onClick={() => navigate('/pacientes')} className="sidebar-item-btn active">
            <Users />
            Pacientes
          </button>

          <button onClick={() => navigate('/consultas')} className="sidebar-item-btn">
            <Calendar />
            Consultas
          </button>
        </nav>
        
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="btn-logout">
            <LogOut />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="main-content">
        {/* Cabeçalho do Prontuário */}
        <header className="patients-header-actions" style={{ marginBottom: '24px' }}>
          <div className="welcome-section" style={{ marginBottom: 0 }}>
            <h2 className="welcome-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowLeft 
                style={{ cursor: 'pointer', marginRight: '8px' }} 
                onClick={() => navigate('/pacientes')} 
              />
              Prontuário do Paciente
            </h2>
          </div>
        </header>

        {error && <div className="error-message" style={{ marginBottom: '24px' }}>{error}</div>}
        {successMessage && (
          <div className="toast-success-message" style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 999 }}>
            <CheckCircle size={22} />
            <span>{successMessage}</span>
          </div>
        )}
        {consultationSuccessMessage && (
          <div className="toast-success-message" style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 999 }}>
            <CheckCircle size={22} />
            <span>{consultationSuccessMessage}</span>
          </div>
        )}

        {loading || !patient ? (
          <div className="form-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Carregando dados do prontuário...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Header com Informações Básicas */}
            <div className="profile-header-container" style={{ margin: 0 }}>
              <div className="profile-avatar-large">
                {getInitials(patient.nome)}
              </div>
              <div className="profile-header-info">
                <h3 className="profile-header-name">{patient.nome}</h3>
                <div className="profile-header-meta">
                  <span><strong>Idade:</strong> {calculateAge(patient.data_nascimento)}</span>
                  {patient.sexo && <span><strong>Sexo:</strong> {patient.sexo}</span>}
                  {patient.whatsapp && (
                    <a 
                      href={formatWhatsAppUrl(patient.whatsapp)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="patient-whatsapp-link"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <MessageSquare size={14} style={{ color: '#25d366' }} />
                      {patient.whatsapp}
                    </a>
                  )}
                  {patient.email && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={14} />
                      {patient.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* SEÇÃO 1 — DADOS DO PACIENTE (EDITÁVEIS) */}
            <section className="form-card" style={{ margin: 0 }}>
              <h3 className="form-step-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid var(--primary-light)', paddingBottom: '12px', marginBottom: '24px' }}>
                <Users size={22} style={{ color: 'var(--primary-color)' }} />
                Seção 1 — Dados do Paciente
              </h3>

              {/* Abas Internas */}
              <div className="form-tabs" style={{ marginBottom: '24px', marginTop: 0 }}>
                <button 
                  type="button"
                  className={`form-tab-btn ${activeDataTab === 'pessoal' ? 'active' : ''}`}
                  onClick={() => setActiveDataTab('pessoal')}
                >
                  Pessoal
                </button>
                <button 
                  type="button"
                  className={`form-tab-btn ${activeDataTab === 'clinico' ? 'active' : ''}`}
                  onClick={() => setActiveDataTab('clinico')}
                >
                  Clínico
                </button>
                <button 
                  type="button"
                  className={`form-tab-btn ${activeDataTab === 'habitos' ? 'active' : ''}`}
                  onClick={() => setActiveDataTab('habitos')}
                >
                  Hábitos
                </button>
              </div>

              <form onSubmit={handleSavePatient}>
                {/* ABA 1: PESSOAL */}
                {activeDataTab === 'pessoal' && (
                  <div className="form-grid">
                    <div className="form-grid-full">
                      <div className="form-group">
                        <label htmlFor="nome">Nome Completo *</label>
                        <input 
                          id="nome"
                          type="text" 
                          placeholder="Ex: Maria Souza da Silva" 
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="dataNascimento">Data de Nascimento</label>
                      <input 
                        id="dataNascimento"
                        type="date" 
                        value={dataNascimento}
                        onChange={(e) => setDataNascimento(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="sexo">Sexo</label>
                      <select 
                        id="sexo" 
                        value={sexo} 
                        onChange={(e) => setSexo(e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="telefone">Telefone</label>
                      <input 
                        id="telefone"
                        type="tel" 
                        placeholder="Ex: (11) 5555-5555" 
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="whatsapp">WhatsApp</label>
                      <input 
                        id="whatsapp"
                        type="tel" 
                        placeholder="Ex: (11) 99999-9999" 
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                      />
                    </div>

                    <div className="form-grid-full">
                      <div className="form-group">
                        <label htmlFor="email">E-mail</label>
                        <input 
                          id="email"
                          type="email" 
                          placeholder="Ex: paciente@email.com" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ABA 2: CLÍNICO */}
                {activeDataTab === 'clinico' && (
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="pesoInicial">Peso Atual (de cadastro)</label>
                      <div className="input-with-suffix-wrapper">
                        <input 
                          id="pesoInicial"
                          type="number" 
                          step="0.01" 
                          placeholder="Ex: 78.4" 
                          value={pesoInicial}
                          onChange={(e) => setPesoInicial(e.target.value)}
                        />
                        <span className="input-suffix">kg</span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="altura">Altura</label>
                      <div className="input-with-suffix-wrapper">
                        <input 
                          id="altura"
                          type="number" 
                          step="1" 
                          placeholder="Ex: 172" 
                          value={altura}
                          onChange={(e) => setAltura(e.target.value)}
                        />
                        <span className="input-suffix">cm</span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="imc">IMC Calculado</label>
                      <input 
                        id="imc"
                        type="text" 
                        readOnly
                        placeholder="Calculado..." 
                        value={getIMC(pesoInicial, altura)}
                        style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', fontWeight: 'bold' }}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="nivelAtividade">Nível de Atividade Física</label>
                      <select 
                        id="nivelAtividade" 
                        value={nivelAtividade} 
                        onChange={(e) => setNivelAtividade(e.target.value)}
                      >
                        <option value="Sedentário">Sedentário</option>
                        <option value="Levemente ativo">Levemente ativo</option>
                        <option value="Moderadamente ativo">Moderadamente ativo</option>
                        <option value="Muito ativo">Muito ativo</option>
                        <option value="Extremamente ativo">Extremamente ativo</option>
                      </select>
                    </div>

                    {/* Objetivos */}
                    <div className="form-grid-full">
                      <div className="form-group">
                        <label>Objetivo Principal</label>
                        <div className="tags-preset-container" style={{ marginBottom: '10px' }}>
                          {presetObjetivos.map(preset => {
                            const isSelected = objetivos.includes(preset);
                            return (
                              <button
                                key={preset}
                                type="button"
                                className={`tag-preset-btn ${isSelected ? 'selected' : ''}`}
                                style={isSelected ? { backgroundColor: 'var(--primary-color)', color: 'white' } : {}}
                                onClick={() => handleTagToggle(preset, objetivos, setObjetivos)}
                              >
                                {preset}
                              </button>
                            );
                          })}
                        </div>
                        <div className="tags-input-container">
                          {objetivos.filter(tag => !presetObjetivos.includes(tag)).map(tag => (
                            <span key={tag} className="tag-badge">
                              {tag}
                              <button 
                                type="button" 
                                className="tag-remove-btn"
                                onClick={() => removeTag(tag, objetivos, setObjetivos)}
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ))}
                          <input 
                            type="text" 
                            placeholder="Outro objetivo..." 
                            value={inputObjetivo}
                            onChange={(e) => setInputObjetivo(e.target.value)}
                            className="tag-input-field"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addCustomTag(inputObjetivo, objetivos, setObjetivos, setInputObjetivo);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-grid-full">
                      <div className="form-group">
                        <label htmlFor="objetivoTexto">Objetivo Geral (Informações Adicionais)</label>
                        <textarea 
                          id="objetivoTexto"
                          placeholder="Meta e queixa principal..."
                          value={objetivoTexto}
                          onChange={(e) => setObjetivoTexto(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Patologias */}
                    <div className="form-grid-full">
                      <div className="form-group">
                        <label>Patologias ou Condições de Saúde</label>
                        <div className="tags-preset-container" style={{ marginBottom: '10px' }}>
                          <button
                            type="button"
                            className={`tag-preset-btn ${patologias.includes('Nenhum') ? 'selected' : ''}`}
                            style={patologias.includes('Nenhum') ? { backgroundColor: '#2e7d32', color: 'white' } : {}}
                            onClick={() => handleTagToggle('Nenhum', patologias, setPatologias)}
                          >
                            Nenhum
                          </button>
                          {presetPatologias.map(preset => {
                            const isSelected = patologias.includes(preset);
                            return (
                              <button
                                key={preset}
                                type="button"
                                className={`tag-preset-btn ${isSelected ? 'selected' : ''}`}
                                style={isSelected ? { backgroundColor: 'var(--primary-color)', color: 'white' } : {}}
                                onClick={() => handleTagToggle(preset, patologias, setPatologias)}
                              >
                                {preset}
                              </button>
                            );
                          })}
                        </div>
                        <div className="tags-input-container">
                          {patologias.filter(tag => !presetPatologias.includes(tag) && tag !== 'Nenhum').map(tag => (
                            <span key={tag} className="tag-badge">
                              {tag}
                              <button 
                                type="button" 
                                className="tag-remove-btn"
                                onClick={() => removeTag(tag, patologias, setPatologias)}
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ))}
                          <input 
                            type="text" 
                            placeholder="Outra patologia..." 
                            value={inputPatologia}
                            onChange={(e) => setInputPatologia(e.target.value)}
                            className="tag-input-field"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addCustomTag(inputPatologia, patologias, setPatologias, setInputPatologia);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Restrições Alimentares */}
                    <div className="form-grid-full">
                      <div className="form-group">
                        <label>Restrições Alimentares</label>
                        <div className="tags-preset-container" style={{ marginBottom: '10px' }}>
                          <button
                            type="button"
                            className={`tag-preset-btn ${restricoesAlimentares.includes('Nenhum') ? 'selected' : ''}`}
                            style={restricoesAlimentares.includes('Nenhum') ? { backgroundColor: '#2e7d32', color: 'white' } : {}}
                            onClick={() => handleTagToggle('Nenhum', restricoesAlimentares, setRestricoesAlimentares)}
                          >
                            Nenhum
                          </button>
                          {presetRestricoes.map(preset => {
                            const isSelected = restricoesAlimentares.includes(preset);
                            return (
                              <button
                                key={preset}
                                type="button"
                                className={`tag-preset-btn ${isSelected ? 'selected' : ''}`}
                                style={isSelected ? { backgroundColor: 'var(--primary-color)', color: 'white' } : {}}
                                onClick={() => handleTagToggle(preset, restricoesAlimentares, setRestricoesAlimentares)}
                              >
                                {preset}
                              </button>
                            );
                          })}
                        </div>
                        <div className="tags-input-container">
                          {restricoesAlimentares.filter(tag => !presetRestricoes.includes(tag) && tag !== 'Nenhum').map(tag => (
                            <span key={tag} className="tag-badge">
                              {tag}
                              <button 
                                type="button" 
                                className="tag-remove-btn"
                                onClick={() => removeTag(tag, restricoesAlimentares, setRestricoesAlimentares)}
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ))}
                          <input 
                            type="text" 
                            placeholder="Outra restrição..." 
                            value={inputRestricao}
                            onChange={(e) => setInputRestricao(e.target.value)}
                            className="tag-input-field"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addCustomTag(inputRestricao, restricoesAlimentares, setRestricoesAlimentares, setInputRestricao);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Alergias */}
                    <div className="form-grid-full">
                      <div className="form-group">
                        <label>Alergias Alimentares</label>
                        <div className="tags-preset-container" style={{ marginBottom: '10px' }}>
                          <button
                            type="button"
                            className={`tag-preset-btn ${alergias.includes('Nenhum') ? 'selected' : ''}`}
                            style={alergias.includes('Nenhum') ? { backgroundColor: '#2e7d32', color: 'white' } : {}}
                            onClick={() => handleTagToggle('Nenhum', alergias, setAlergias)}
                          >
                            Nenhum
                          </button>
                          {presetAlergias.map(preset => {
                            const isSelected = alergias.includes(preset);
                            return (
                              <button
                                key={preset}
                                type="button"
                                className={`tag-preset-btn ${isSelected ? 'selected' : ''}`}
                                style={isSelected ? { backgroundColor: 'var(--primary-color)', color: 'white' } : {}}
                                onClick={() => handleTagToggle(preset, alergias, setAlergias)}
                              >
                                {preset}
                              </button>
                            );
                          })}
                        </div>
                        <div className="tags-input-container">
                          {alergias.filter(tag => !presetAlergias.includes(tag) && tag !== 'Nenhum').map(tag => (
                            <span key={tag} className="tag-badge">
                              {tag}
                              <button 
                                type="button" 
                                className="tag-remove-btn"
                                onClick={() => removeTag(tag, alergias, setAlergias)}
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ))}
                          <input 
                            type="text" 
                            placeholder="Outra alergia..." 
                            value={inputAlergia}
                            onChange={(e) => setInputAlergia(e.target.value)}
                            className="tag-input-field"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addCustomTag(inputAlergia, alergias, setAlergias, setInputAlergia);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="medicamentos">Medicamentos Contínuos</label>
                      <textarea 
                        id="medicamentos"
                        placeholder="Ex: Metformina 850mg..."
                        value={medicamentos}
                        onChange={(e) => setMedicamentos(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="suplementos">Suplementação Atual</label>
                      <textarea 
                        id="suplementos"
                        placeholder="Ex: Creatina 5g, Whey..."
                        value={suplementos}
                        onChange={(e) => setSuplementos(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* ABA 3: HÁBITOS */}
                {activeDataTab === 'habitos' && (
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="refeicoesPorDia">Refeições por dia</label>
                      <input 
                        id="refeicoesPorDia"
                        type="number"
                        placeholder="Ex: 4"
                        value={refeicoesPorDia}
                        onChange={(e) => setRefeicoesPorDia(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="horarioAcorda">Horário que Acorda</label>
                      <input 
                        id="horarioAcorda"
                        type="text"
                        placeholder="Ex: 06:30"
                        value={horarioAcorda}
                        onChange={(e) => setHorarioAcorda(e.target.value)}
                        onBlur={() => handleHourBlur(horarioAcorda, setHorarioAcorda)}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="horarioDorme">Horário que Dorme</label>
                      <input 
                        id="horarioDorme"
                        type="text"
                        placeholder="Ex: 22:30"
                        value={horarioDorme}
                        onChange={(e) => setHorarioDorme(e.target.value)}
                        onBlur={() => handleHourBlur(horarioDorme, setHorarioDorme)}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="litrosAgua">Consumo de Água Diário (L)</label>
                      <input 
                        id="litrosAgua"
                        type="number"
                        step="0.1"
                        placeholder="Ex: 2.5"
                        value={litrosAgua}
                        onChange={(e) => setLitrosAgua(e.target.value)}
                      />
                    </div>

                    <div className="form-grid-full">
                      <div className="toggle-group">
                        <span className="toggle-label">Pratica Atividade Física Regularmente?</span>
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={atividadeFisica}
                            onChange={(e) => setAtividadeFisica(e.target.checked)}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>

                    {atividadeFisica && (
                      <div className="form-grid-full conditional-container">
                        <div className="form-group">
                          <label htmlFor="atividadeFisicaDescricao">Quais modalidades e frequência semanal?</label>
                          <input 
                            id="atividadeFisicaDescricao"
                            type="text"
                            placeholder="Ex: Musculação 4x na semana, Corrida 2x..."
                            value={atividadeFisicaDescricao}
                            onChange={(e) => setAtividadeFisicaDescricao(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <div className="form-grid-full">
                      <div className="form-group">
                        <label htmlFor="observacoes">Observações de Hábitos e Rotina</label>
                        <textarea 
                          id="observacoes"
                          placeholder="Outros hábitos, qualidade de sono, histórico familiar..."
                          value={observacoes}
                          onChange={(e) => setObservacoes(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Botão de Salvar Alterações */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={savingPatient}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
                  >
                    <Save size={18} />
                    {savingPatient ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </div>
              </form>
            </section>

            {/* SEÇÃO 2 — CONSULTAS */}
            <section className="form-card" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--primary-light)', paddingBottom: '12px', marginBottom: '24px' }}>
                <h3 className="form-step-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                  <Calendar size={22} style={{ color: 'var(--primary-color)' }} />
                  Seção 2 — Consultas & Acompanhamento
                </h3>
                <button 
                  onClick={openNewConsultationModal}
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', padding: '8px 16px' }}
                >
                  <Plus size={16} />
                  Nova Consulta
                </button>
              </div>

              {/* Gráfico de Evolução (Destaque) */}
              <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '24px', marginBottom: '24px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-color)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={18} style={{ color: 'var(--primary-color)' }} />
                  Evolução do Peso
                </h4>
                {renderWeightChart()}
              </div>

              {/* Tabela de Consultas */}
              <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-color)', marginBottom: '12px' }}>
                Histórico de Consultas ({consultations.length})
              </h4>
              
              {consultations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)', background: '#fafafa', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                  Nenhuma consulta foi registrada para este paciente ainda.
                </div>
              ) : (
                <div className="patients-table-wrapper" style={{ border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                  <table className="patients-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Peso (kg)</th>
                        <th>Cintura (cm)</th>
                        <th>Quadril (cm)</th>
                        <th>Gordura (%)</th>
                        <th>Próximo Retorno</th>
                        <th>Observações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consultations.map(c => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: '700' }}>
                            {new Date(c.data_consulta + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td>{c.peso ? `${c.peso} kg` : '-'}</td>
                          <td>{c.cintura ? `${c.cintura} cm` : '-'}</td>
                          <td>{c.quadril ? `${c.quadril} cm` : '-'}</td>
                          <td>{c.percentual_gordura ? `${c.percentual_gordura}%` : '-'}</td>
                          <td>
                            {c.proximo_retorno 
                              ? new Date(c.proximo_retorno + 'T00:00:00').toLocaleDateString('pt-BR') 
                              : '-'}
                          </td>
                          <td style={{ maxWidth: '280px', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                            {c.observacoes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* SEÇÃO 3 — PLANOS ALIMENTARES */}
            <section className="form-card" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--primary-light)', paddingBottom: '12px', marginBottom: '24px' }}>
                <h3 className="form-step-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                  <FileText size={22} style={{ color: 'var(--primary-color)' }} />
                  Seção 3 — Planos Alimentares
                </h3>
                <button 
                  type="button"
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', padding: '8px 16px', opacity: 0.8 }}
                >
                  Gerar Plano Alimentar
                </button>
              </div>

              {foodPlans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)', background: '#fafafa', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                  Nenhum plano alimentar gerado ainda
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {foodPlans.map(plan => (
                    <div 
                      key={plan.id}
                      onClick={() => setSelectedFoodPlan(plan)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px 20px',
                        backgroundColor: '#fafafa',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      className="no-return-item"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <FileText size={20} style={{ color: 'var(--primary-color)' }} />
                        <div>
                          <span style={{ fontWeight: '600' }}>Plano Alimentar</span>
                          <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Gerado em: {new Date(plan.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={18} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        )}
      </main>

      {/* MODAL "NOVA CONSULTA" (SEÇÃO 2) */}
      {isNewConsultationModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsNewConsultationModalOpen(false)}>
          <div className="modal-wrapper" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <header className="modal-header">
              <div className="modal-title-container">
                <Calendar className="logo-flower" style={{ color: 'var(--primary-color)', width: '32px', height: '32px' }} />
                <div>
                  <h3 className="modal-title">Registrar Nova Consulta</h3>
                  <p className="modal-subtitle">Adicione as medições antropométricas do paciente</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setIsNewConsultationModalOpen(false)}>
                <X size={24} />
              </button>
            </header>

            <form onSubmit={handleSaveConsultation}>
              <div className="modal-body">
                <div className="form-grid" style={{ marginBottom: 0 }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="cDataConsulta">Data da Consulta *</label>
                    <input 
                      id="cDataConsulta"
                      type="date"
                      value={cDataConsulta}
                      onChange={(e) => setCDataConsulta(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="cPeso">Peso Atual *</label>
                    <div className="input-with-suffix-wrapper">
                      <input 
                        id="cPeso"
                        type="number"
                        step="0.01"
                        placeholder="Ex: 75.5"
                        value={cPeso}
                        onChange={(e) => setCPeso(e.target.value)}
                        required
                      />
                      <span className="input-suffix">kg</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="cCintura">Cintura (opcional)</label>
                    <div className="input-with-suffix-wrapper">
                      <input 
                        id="cCintura"
                        type="number"
                        step="0.1"
                        placeholder="Ex: 82.0"
                        value={cCintura}
                        onChange={(e) => setCCintura(e.target.value)}
                      />
                      <span className="input-suffix">cm</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="cQuadril">Quadril (opcional)</label>
                    <div className="input-with-suffix-wrapper">
                      <input 
                        id="cQuadril"
                        type="number"
                        step="0.1"
                        placeholder="Ex: 96.5"
                        value={cQuadril}
                        onChange={(e) => setCQuadril(e.target.value)}
                      />
                      <span className="input-suffix">cm</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="cPercentualGordura">% de Gordura (opcional)</label>
                    <div className="input-with-suffix-wrapper">
                      <input 
                        id="cPercentualGordura"
                        type="number"
                        step="0.1"
                        placeholder="Ex: 18.2"
                        value={cPercentualGordura}
                        onChange={(e) => setCPercentualGordura(e.target.value)}
                      />
                      <span className="input-suffix">%</span>
                    </div>
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="cProximoRetorno">Próximo Retorno (opcional)</label>
                    <input 
                      id="cProximoRetorno"
                      type="date"
                      value={cProximoRetorno}
                      onChange={(e) => setCProximoRetorno(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="cObservacoes">Observações Clínicas / Evolução</label>
                    <textarea 
                      id="cObservacoes"
                      placeholder="Relato sobre a dieta, queixas, adaptações..."
                      value={cObservacoes}
                      onChange={(e) => setCObservacoes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <footer className="modal-footer" style={{ gap: '12px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setIsNewConsultationModalOpen(false)}
                  disabled={savingConsultation}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={savingConsultation}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Save size={16} />
                  {savingConsultation ? 'Registrando...' : 'Salvar consulta'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHES PLANO ALIMENTAR (SEÇÃO 3) */}
      {selectedFoodPlan && (
        <div className="modal-backdrop" onClick={() => setSelectedFoodPlan(null)}>
          <div className="modal-wrapper" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <header className="modal-header">
              <div className="modal-title-container">
                <FileText className="logo-flower" style={{ color: 'var(--primary-color)', width: '32px', height: '32px' }} />
                <div>
                  <h3 className="modal-title">Detalhamento do Plano Alimentar</h3>
                  <p className="modal-subtitle">
                    Gerado em: {new Date(selectedFoodPlan.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedFoodPlan(null)}>
                <X size={24} />
              </button>
            </header>

            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {renderPlanoConteudo(selectedFoodPlan.conteudo)}
            </div>

            <footer className="modal-footer">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setSelectedFoodPlan(null)}
              >
                Fechar
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientProfile;
