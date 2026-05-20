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
  Save,
  X,
  CheckCircle,
  Calendar
} from 'lucide-react';

const NewPatient: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Capturar o ID da URL se for modo edição
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  // Estado das Abas: 'pessoal' | 'clinico' | 'habitos'
  const [activeTab, setActiveTab] = useState<'pessoal' | 'clinico' | 'habitos'>('pessoal');
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingData, setFetchingData] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);

  // Estados dos Campos do Formulário
  // Aba 1: Dados Pessoais
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');

  // Aba 2: Clínico
  const [pesoInicial, setPesoInicial] = useState('');
  const [altura, setAltura] = useState('');
  const [nivelAtividade, setNivelAtividade] = useState('moderado');
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

  // Aba 3: Hábitos
  const [refeicoesPorDia, setRefeicoesPorDia] = useState('');
  const [horarioAcorda, setHorarioAcorda] = useState('');
  const [horarioDorme, setHorarioDorme] = useState('');
  const [litrosAgua, setLitrosAgua] = useState('');
  const [atividadeFisica, setAtividadeFisica] = useState(false);
  const [atividadeFisicaDescricao, setAtividadeFisicaDescricao] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Presets de Múltipla Escolha
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

  // Cálculo da Idade Automática
  const calculateAge = (dateString: string) => {
    if (!dateString) return '';
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} anos`;
  };

  // Cálculo Dinâmico do IMC (somente leitura)
  const getIMC = () => {
    const p = parseFloat(pesoInicial);
    const a = parseFloat(altura);
    if (p > 0 && a > 0) {
      // Altura em cm convertida para metros
      const heightInMeters = a > 3 ? a / 100 : a;
      const imc = p / (heightInMeters * heightInMeters);
      return imc.toFixed(2);
    }
    return '';
  };

  // Conversão Inteligente de Horário
  const formatHourString = (value: string): string => {
    const clean = value.replace(/\D/g, '');
    if (!clean) return '';
    const num = parseInt(clean, 10);
    if (isNaN(num)) return '';
    
    // 1 ou 2 dígitos (ex: 6 ou 23)
    if (clean.length <= 2) {
      if (num >= 0 && num <= 23) {
        return `${String(num).padStart(2, '0')}:00`;
      }
      return '';
    }
    
    // 3 ou 4 dígitos (ex: 630 ou 2230)
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

  // Lógica de Múltipla Escolha com "Nenhum" excludente
  const handleTagToggle = (
    tag: string,
    currentTags: string[],
    setCurrentTags: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setError(null);
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

  // Carregar dados no modo Edição
  useEffect(() => {
    const fetchPatientData = async () => {
      if (!isEditMode || !id || !user) return;
      setFetchingData(true);
      setError(null);
      
      try {
        const { data, error: dbError } = await supabase
          .from('pacientes')
          .select('*')
          .eq('id', id)
          .single();

        if (dbError) throw dbError;

        if (data) {
          setNome(data.nome || '');
          setDataNascimento(data.data_nascimento || '');
          setSexo(data.sexo || '');
          setTelefone(data.telefone || '');
          setWhatsapp(data.whatsapp || '');
          setEmail(data.email || '');
          
          setPesoInicial(data.peso_inicial !== null ? String(data.peso_inicial) : '');
          setAltura(data.altura !== null ? String(data.altura) : '');
          setNivelAtividade(data.nivel_atividade || 'moderado');
          setObjetivos(data.objetivos || []);
          setObjetivoTexto(data.objetivo_texto || '');
          
          setPatologias(data.patologias || []);
          setRestricoesAlimentares(data.restricoes_alimentares || []);
          setAlergias(data.alergias || []);
          setMedicamentos(data.medicamentos || '');
          setSuplementos(data.suplementos || '');
          
          setRefeicoesPorDia(data.refeicoes_por_dia !== null ? String(data.refeicoes_por_dia) : '');
          setHorarioAcorda(data.horario_acorda || '');
          setHorarioDorme(data.horario_dorme || '');
          setLitrosAgua(data.litros_agua !== null ? String(data.litros_agua) : '');
          setAtividadeFisica(!!data.atividade_fisica);
          setAtividadeFisicaDescricao(data.atividade_fisica_descricao || '');
          setObservacoes(data.observacoes || '');
        }
      } catch (err: any) {
        console.error('Erro ao buscar dados do paciente:', err);
        setError('Não foi possível carregar os dados para edição.');
      } finally {
        setFetchingData(false);
      }
    };

    fetchPatientData();
  }, [id, isEditMode, user]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nome.trim()) {
      setError('O nome completo do paciente é obrigatório.');
      setActiveTab('pessoal');
      return;
    }

    if (!user) return;
    setLoading(true);

    const payload = {
      nutricionista_id: user.id,
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
      let patientId = id;

      if (isEditMode && id) {
        const { error: dbError } = await supabase
          .from('pacientes')
          .update(payload)
          .eq('id', id);

        if (dbError) throw dbError;
      } else {
        const { data, error: dbError } = await supabase
          .from('pacientes')
          .insert([payload])
          .select('id')
          .single();

        if (dbError) throw dbError;
        if (data) {
          patientId = data.id;
          
          // Registrar consulta inicial automática se peso ou altura inicial forem preenchidos
          if (pesoInicial) {
            const todayStr = new Date().toISOString().split('T')[0];
            const { error: initialConsultationError } = await supabase
              .from('consultas')
              .insert([{
                paciente_id: data.id,
                data_consulta: todayStr,
                peso: parseFloat(pesoInicial),
                observacoes: 'Consulta Inicial (Gerada automaticamente no cadastro)'
              }]);
            
            if (initialConsultationError) {
              console.error('Erro ao gerar consulta inicial automática:', initialConsultationError);
            }
          }
        }
      }
      
      // Exibir feedback de sucesso
      setShowSuccessToast(true);
      
      // Redirecionar para o perfil do paciente cadastrado após 1.5s
      setTimeout(() => {
        navigate(`/pacientes/${patientId}`);
      }, 1500);

    } catch (err: any) {
      console.error('Erro ao salvar paciente:', err);
      setError(err.message || 'Ocorreu um erro ao salvar os dados. Verifique a conexão.');
      setLoading(false);
    }
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
        <header className="patients-header-actions">
          <div className="welcome-section" style={{ marginBottom: 0 }}>
            <h2 className="welcome-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowLeft 
                style={{ cursor: 'pointer', marginRight: '8px' }} 
                onClick={() => navigate('/pacientes')} 
              />
              {isEditMode ? 'Editar Cadastro do Paciente' : 'Novo Paciente'}
            </h2>
            <p className="welcome-subtitle">
              {isEditMode 
                ? 'Atualize as informações do paciente nas abas clínicas e salve.' 
                : 'Insira os dados clínicos, pessoais e hábitos diários para criar o prontuário.'}
            </p>
          </div>
        </header>

        {error && <div className="error-message" style={{ marginTop: '20px' }}>{error}</div>}

        {/* Abas de Navegação */}
        <div className="form-tabs" style={{ marginTop: '24px' }}>
          <button 
            type="button"
            className={`form-tab-btn ${activeTab === 'pessoal' ? 'active' : ''}`}
            onClick={() => setActiveTab('pessoal')}
          >
            Pessoal
          </button>
          <button 
            type="button"
            className={`form-tab-btn ${activeTab === 'clinico' ? 'active' : ''}`}
            onClick={() => {
              if (!nome.trim()) {
                setError('O nome completo do paciente é obrigatório para acessar as abas clínicas.');
                return;
              }
              setError(null);
              setActiveTab('clinico');
            }}
          >
            Clínico
          </button>
          <button 
            type="button"
            className={`form-tab-btn ${activeTab === 'habitos' ? 'active' : ''}`}
            onClick={() => {
              if (!nome.trim()) {
                setError('O nome completo do paciente é obrigatório para acessar as abas clínicas.');
                return;
              }
              setError(null);
              setActiveTab('habitos');
            }}
          >
            Hábitos
          </button>
        </div>

        {fetchingData ? (
          <div className="form-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Carregando dados do paciente...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            
            {/* ABA 1: PESSOAL */}
            {activeTab === 'pessoal' && (
              <div className="form-card">
                <h3 className="form-step-title">Informações Pessoais & Contatos</h3>
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
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input 
                        id="dataNascimento"
                        type="date" 
                        value={dataNascimento}
                        onChange={(e) => setDataNascimento(e.target.value)}
                        style={{ flexGrow: 1 }}
                      />
                      {dataNascimento && (
                        <span style={{ 
                          padding: '10px 14px', 
                          backgroundColor: 'var(--bg-color)', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border-color)',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: 'var(--primary-color)'
                        }}>
                          {calculateAge(dataNascimento)}
                        </span>
                      )}
                    </div>
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
              </div>
            )}

            {/* ABA 2: CLÍNICO */}
            {activeTab === 'clinico' && (
              <div className="form-card">
                <h3 className="form-step-title">Avaliação Antropométrica & Anamnese</h3>
                <div className="form-grid">
                  
                  {/* Peso */}
                  <div className="form-group">
                    <label htmlFor="pesoInicial">Peso Atual</label>
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

                  {/* Altura */}
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

                  {/* IMC */}
                  <div className="form-group">
                    <label htmlFor="imc">IMC (Índice de Massa Corporal)</label>
                    <input 
                      id="imc"
                      type="text" 
                      readOnly
                      placeholder="Calculado automaticamente..." 
                      value={getIMC()}
                      style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', fontWeight: 'bold' }}
                    />
                  </div>

                  {/* Nível de Atividade */}
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
                      <label>Objetivo Principal (Selecione um ou mais)</label>
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
                          placeholder="Adicionar outro objetivo clínico..." 
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
                        placeholder="Descreva detalhes específicos sobre a queixa principal e metas do paciente..."
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
                          placeholder="Adicionar patologia personalizada..." 
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
                          placeholder="Adicionar restrição..." 
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
                          placeholder="Adicionar alergia..." 
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
                      placeholder="Indique medicamentos em uso diário pelo paciente..."
                      value={medicamentos}
                      onChange={(e) => setMedicamentos(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="suplementos">Suplementos em Uso</label>
                    <textarea 
                      id="suplementos"
                      placeholder="Creatina, Whey, Vitaminas, etc..."
                      value={suplementos}
                      onChange={(e) => setSuplementos(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ABA 3: HÁBITOS */}
            {activeTab === 'habitos' && (
              <div className="form-card">
                <h3 className="form-step-title">Hábitos, Hidratação & Rotina</h3>
                <div className="form-grid">
                  
                  {/* Refeições */}
                  <div className="form-group">
                    <label htmlFor="refeicoesPorDia">Refeições por dia</label>
                    <input 
                      id="refeicoesPorDia"
                      type="number" 
                      placeholder="Ex: 5" 
                      value={refeicoesPorDia}
                      onChange={(e) => setRefeicoesPorDia(e.target.value)}
                    />
                  </div>

                  {/* Acorda */}
                  <div className="form-group">
                    <label htmlFor="horarioAcorda">Horário que Acorda</label>
                    <input 
                      id="horarioAcorda"
                      type="text" 
                      placeholder="Ex: 6 ou 630" 
                      value={horarioAcorda}
                      onChange={(e) => setHorarioAcorda(e.target.value)}
                      onBlur={() => handleHourBlur(horarioAcorda, setHorarioAcorda)}
                    />
                  </div>

                  {/* Dorme */}
                  <div className="form-group">
                    <label htmlFor="horarioDorme">Horário que Dorme</label>
                    <input 
                      id="horarioDorme"
                      type="text" 
                      placeholder="Ex: 23 ou 2230" 
                      value={horarioDorme}
                      onChange={(e) => setHorarioDorme(e.target.value)}
                      onBlur={() => handleHourBlur(horarioDorme, setHorarioDorme)}
                    />
                  </div>

                  {/* Água */}
                  <div className="form-group">
                    <label htmlFor="litrosAgua">Consumo Diário de Água</label>
                    <div className="input-with-suffix-wrapper">
                      <input 
                        id="litrosAgua"
                        type="number" 
                        step="0.1" 
                        placeholder="Ex: 3" 
                        value={litrosAgua}
                        onChange={(e) => setLitrosAgua(e.target.value)}
                      />
                      <span className="input-suffix">litros</span>
                    </div>
                  </div>

                  {/* Atividade Física */}
                  <div className="form-grid-full">
                    <div className="toggle-group">
                      <span className="toggle-label">Pratica atividade física regularmente?</span>
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
                        <label htmlFor="atividadeFisicaDescricao">Qual atividade e frequência semanal?</label>
                        <textarea 
                          id="atividadeFisicaDescricao"
                          placeholder="Ex: Musculação 4x na semana, Natação 2x."
                          value={atividadeFisicaDescricao}
                          onChange={(e) => setAtividadeFisicaDescricao(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Observações Gerais */}
                  <div className="form-grid-full">
                    <div className="form-group">
                      <label htmlFor="observacoes">Observações Gerais</label>
                      <textarea 
                        id="observacoes"
                        placeholder="Outras anotações e comentários adicionais sobre a rotina..."
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Ações Inferiores */}
            <div className="stepper-actions">
              <button 
                type="button" 
                onClick={() => navigate('/pacientes')} 
                className="btn-secondary" 
                disabled={loading}
              >
                Cancelar
              </button>

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={loading}
              >
                <Save size={16} />
                {loading 
                  ? 'Salvando...' 
                  : (isEditMode ? 'Salvar Alterações' : 'Salvar Cadastro')}
              </button>
            </div>
          </form>
        )}

        {/* Success Toast Notification */}
        {showSuccessToast && (
          <div className="toast-success-message">
            <CheckCircle size={22} />
            <span>Ficha do paciente salva com sucesso!</span>
          </div>
        )}
      </main>
    </div>
  );
};

// Auxiliar para remover tags livres da lista
const removeTag = (
  tagToRemove: string, 
  tagsList: string[], 
  setTagsList: React.Dispatch<React.SetStateAction<string[]>>
) => {
  setTagsList(tagsList.filter(tag => tag !== tagToRemove));
};

export default NewPatient;
