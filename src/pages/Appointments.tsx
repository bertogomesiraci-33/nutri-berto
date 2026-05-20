import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Flower, 
  Users, 
  LayoutDashboard, 
  LogOut, 
  Calendar,
  Plus,
  Save,
  CheckCircle
} from 'lucide-react';

interface Paciente {
  id: string;
  nome: string;
}

interface Consulta {
  id: string;
  paciente_id: string;
  data_consulta: string;
  peso: number | null;
  cintura: number | null;
  quadril: number | null;
  percentual_gordura: number | null;
  observacoes: string | null;
  proximo_retorno: string | null;
  pacientes: {
    id: string;
    nome: string;
    objetivos?: string[] | null;
    nutricionista_id: string;
  };
  nutricionista_nome?: string;
}

// Auxiliar para formatar data localmente no fuso horário do usuário
const formatDateLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Appointments: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Estados
  const [activeTab, setActiveTab] = useState<'agenda' | 'registrar'>('agenda');
  const [patients, setPatients] = useState<Paciente[]>([]);
  const [appointments, setAppointments] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);

  // Estados do Formulário de Consulta
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [dataConsulta, setDataConsulta] = useState<string>(formatDateLocal(new Date()));
  const [peso, setPeso] = useState<string>('');
  const [cintura, setCintura] = useState<string>('');
  const [quadril, setQuadril] = useState<string>('');
  const [percentualGordura, setPercentualGordura] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [proximoRetorno, setProximoRetorno] = useState<string>('');

  // Gerar dias da semana atual (Segunda a Domingo)
  const getWeekDays = () => {
    const current = new Date();
    const day = current.getDay();
    // Ajusta para segunda-feira da semana atual (1 = Segunda, 0 = Domingo, etc.)
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d);
    }
    return week;
  };

  const weekDays = getWeekDays();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    }
  };

  // Carregar dados (Pacientes e Consultas da Semana)
  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Carregar Pacientes
      const { data: patientsData, error: pError } = await supabase
        .from('pacientes')
        .select('id, nome')
        .eq('nutricionista_id', user.id)
        .order('nome', { ascending: true });

      if (pError) throw pError;
      setPatients(patientsData || []);

      // 2. Carregar Consultas da Semana com dados da nutricionista
      const startOfWeek = formatDateLocal(weekDays[0]);
      const endOfWeek = formatDateLocal(weekDays[6]);

      // Primeiro buscamos as consultas da semana
      const { data: consultationsData, error: cError } = await supabase
        .from('consultas')
        .select('*, pacientes!inner(id, nome, nutricionista_id)')
        .eq('pacientes.nutricionista_id', user.id)
        .gte('data_consulta', startOfWeek)
        .lte('data_consulta', endOfWeek)
        .order('data_consulta', { ascending: true });

      if (cError) throw cError;

      // Depois buscamos o nome da nutricionista (mesmo usuário) – já temos o ID do nutricionista via usuário
      // Supabase já conhece o id do usuário como nutricionista, então podemos usar o próprio user.id para buscar o nome
      const { data: nutrData, error: nutrError } = await supabase
        .from('nutricionistas')
        .select('nome')
        .eq('id', user.id)
        .single();
      if (nutrError) throw nutrError;
      const nutricionistaNome = nutrData?.nome ?? '';

      // Enriquecer cada consulta com o nome da nutricionista
      const enrichedConsultations = (consultationsData as any).map((c: any) => ({
        ...c,
        nutricionista_nome: nutricionistaNome
      }));

      setAppointments(enrichedConsultations);

    } catch (err: any) {
      console.error('Erro ao buscar dados de consultas:', err);
      setError('Não foi possível carregar as informações de agenda.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Handler de envio do formulário de consulta
  const handleSubmitConsulta = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPatientId) {
      setError('Selecione um paciente para registrar a consulta.');
      return;
    }

    if (!dataConsulta) {
      setError('Selecione a data da consulta.');
      return;
    }

    setSaving(true);

    const payload = {
      paciente_id: selectedPatientId,
      data_consulta: dataConsulta,
      peso: peso ? parseFloat(peso) : null,
      cintura: cintura ? parseFloat(cintura) : null,
      quadril: quadril ? parseFloat(quadril) : null,
      percentual_gordura: percentualGordura ? parseFloat(percentualGordura) : null,
      observacoes: observacoes.trim() || null,
      proximo_retorno: proximoRetorno || null
    };

    try {
      const { error: insertError } = await supabase
        .from('consultas')
        .insert([payload]);

      if (insertError) throw insertError;

      // Sucesso
      setShowSuccessToast(true);
      
      // Limpar formulário
      setSelectedPatientId('');
      setPeso('');
      setCintura('');
      setQuadril('');
      setPercentualGordura('');
      setObservacoes('');
      setProximoRetorno('');
      setDataConsulta(formatDateLocal(new Date()));

      // Atualizar dados da agenda
      await fetchData();

      setTimeout(() => {
        setShowSuccessToast(false);
        setActiveTab('agenda');
      }, 1500);

    } catch (err: any) {
      console.error('Erro ao salvar consulta:', err);
      setError(err.message || 'Erro ao registrar a consulta no banco de dados.');
    } finally {
      setSaving(false);
    }
  };

  // Filtrar consultas por dia da semana
  const getAppointmentsForDay = (date: Date) => {
    const formattedDate = formatDateLocal(date);
    return appointments.filter(app => app.data_consulta === formattedDate);
  };

  const translateDayName = (dayIndex: number) => {
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return days[dayIndex];
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
          
          <button onClick={() => navigate('/pacientes')} className="sidebar-item-btn">
            <Users />
            Pacientes
          </button>
          
          <button onClick={() => navigate('/consultas')} className="sidebar-item-btn active">
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
            <h2 className="welcome-title">Central de Consultas</h2>
            <p className="welcome-subtitle">Gerencie sua agenda de atendimento e registre a evolução antropométrica.</p>
          </div>
          <button 
            onClick={() => setActiveTab(activeTab === 'agenda' ? 'registrar' : 'agenda')} 
            className="btn-primary"
          >
            {activeTab === 'agenda' ? (
              <>
                <Plus size={18} />
                Registrar Consulta
              </>
            ) : (
              <>
                <Calendar size={18} />
                Ver Agenda Semanal
              </>
            )}
          </button>
        </header>

        {error && <div className="error-message" style={{ marginTop: '20px' }}>{error}</div>}

        {/* Abas de Navegação */}
        <div className="form-tabs" style={{ marginTop: '24px' }}>
          <button 
            type="button"
            className={`form-tab-btn ${activeTab === 'agenda' ? 'active' : ''}`}
            onClick={() => setActiveTab('agenda')}
          >
            Agenda da Semana
          </button>
          <button 
            type="button"
            className={`form-tab-btn ${activeTab === 'registrar' ? 'active' : ''}`}
            onClick={() => setActiveTab('registrar')}
          >
            Registrar Nova Consulta
          </button>
        </div>

        {loading ? (
          <div className="form-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Buscando agenda de atendimentos...</p>
          </div>
        ) : (
          <>
            {/* TELA 1: AGENDA SEMANAL */}
            {activeTab === 'agenda' && (
              <div className="weekly-agenda">
                {weekDays.map((day, idx) => {
                  const dayApps = getAppointmentsForDay(day);
                  const isToday = new Date().toDateString() === day.toDateString();
                  
                  return (
                    <div 
                      key={idx} 
                      className={`agenda-day-card ${isToday ? 'today' : ''}`}
                    >
                      <header className="agenda-day-header">
                        <h4 className="agenda-day-name">{translateDayName(day.getDay())}</h4>
                        <span className="agenda-day-date">{day.toLocaleDateString('pt-BR')}</span>
                      </header>

                      <div className="agenda-consultations-list">
                        {dayApps.length === 0 ? (
                          <div className="agenda-empty-day">Sem consultas</div>
                        ) : (
                          dayApps.map(app => {
                            const mainGoal = app.pacientes.objetivos && app.pacientes.objetivos.length > 0 
                              ? app.pacientes.objetivos[0] 
                              : 'Consulta clínica';

                            return (
                              <div 
                                key={app.id} 
                                className="agenda-patient-item"
                                onClick={() => navigate(`/pacientes/${app.pacientes.id}`)}
                                title="Acessar prontuário"
                              >
                                <span className="agenda-patient-name">{app.pacientes.nome}</span>
                                <div className="agenda-patient-details">
                                  <span style={{ 
                                    fontSize: '0.7rem', 
                                    backgroundColor: 'var(--primary-light)', 
                                    color: 'var(--primary-color)', 
                                    padding: '2px 6px', 
                                    borderRadius: '4px',
                                    fontWeight: '600'
                                  }}>
                                    {mainGoal}
                                  </span>
                                  {/* Exibir nome da nutricionista que agendou */}
                                  <span style={{ fontSize: '0.7rem', marginLeft: '8px', color: '#555' }}>
                                    {app.nutricionista_nome}
                                  </span>
                                  {app.peso && (
                                    <span style={{ fontWeight: '500', marginLeft: '8px' }}>{app.peso} kg</span>
                                  )}
                                  {/* Exibir data de próximo retorno, se houver */}
                                  {app.proximo_retorno && (
                                    <span style={{ fontSize: '0.7rem', marginLeft: '8px', color: '#888' }}>
                                      Retorno: {new Date(app.proximo_retorno).toLocaleDateString('pt-BR')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TELA 2: REGISTRAR CONSULTA */}
            {activeTab === 'registrar' && (
              <form onSubmit={handleSubmitConsulta}>
                <div className="form-card">
                  <h3 className="form-step-title">Ficha de Evolução do Paciente</h3>
                  
                  <div className="form-grid">
                    {/* Seleção do Paciente */}
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label htmlFor="selectedPatient">Paciente *</label>
                      <select 
                        id="selectedPatient"
                        value={selectedPatientId}
                        onChange={(e) => setSelectedPatientId(e.target.value)}
                        required
                      >
                        <option value="">Selecione o paciente...</option>
                        {patients.map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                    </div>

                    {/* Data da Consulta */}
                    <div className="form-group">
                      <label htmlFor="dataConsulta">Data da Consulta *</label>
                      <input 
                        id="dataConsulta"
                        type="date"
                        value={dataConsulta}
                        onChange={(e) => setDataConsulta(e.target.value)}
                        required
                      />
                    </div>

                    {/* Peso */}
                    <div className="form-group">
                      <label htmlFor="peso">Peso Atual</label>
                      <div className="input-with-suffix-wrapper">
                        <input 
                          id="peso"
                          type="number"
                          step="0.01"
                          placeholder="Ex: 76.5"
                          value={peso}
                          onChange={(e) => setPeso(e.target.value)}
                        />
                        <span className="input-suffix">kg</span>
                      </div>
                    </div>

                    {/* Cintura */}
                    <div className="form-group">
                      <label htmlFor="cintura">Cintura</label>
                      <div className="input-with-suffix-wrapper">
                        <input 
                          id="cintura"
                          type="number"
                          step="0.1"
                          placeholder="Ex: 82.5"
                          value={cintura}
                          onChange={(e) => setCintura(e.target.value)}
                        />
                        <span className="input-suffix">cm</span>
                      </div>
                    </div>

                    {/* Quadril */}
                    <div className="form-group">
                      <label htmlFor="quadril">Quadril</label>
                      <div className="input-with-suffix-wrapper">
                        <input 
                          id="quadril"
                          type="number"
                          step="0.1"
                          placeholder="Ex: 98.2"
                          value={quadril}
                          onChange={(e) => setQuadril(e.target.value)}
                        />
                        <span className="input-suffix">cm</span>
                      </div>
                    </div>

                    {/* Percentual Gordura */}
                    <div className="form-group">
                      <label htmlFor="gordura">Percentual de Gordura</label>
                      <div className="input-with-suffix-wrapper">
                        <input 
                          id="gordura"
                          type="number"
                          step="0.1"
                          placeholder="Ex: 18.5"
                          value={percentualGordura}
                          onChange={(e) => setPercentualGordura(e.target.value)}
                        />
                        <span className="input-suffix">%</span>
                      </div>
                    </div>

                    {/* Próximo Retorno */}
                    <div className="form-group">
                      <label htmlFor="proximoRetorno">Data do Próximo Retorno</label>
                      <input 
                        id="proximoRetorno"
                        type="date"
                        value={proximoRetorno}
                        onChange={(e) => setProximoRetorno(e.target.value)}
                      />
                    </div>

                    {/* Observações da Consulta */}
                    <div className="form-grid-full">
                      <div className="form-group">
                        <label htmlFor="observacoes">Observações Clínicas & Notas de Evolução</label>
                        <textarea 
                          id="observacoes"
                          placeholder="Descreva a evolução do plano, dificuldades relatadas e considerações físicas do paciente..."
                          value={observacoes}
                          onChange={(e) => setObservacoes(e.target.value)}
                          rows={4}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="stepper-actions">
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('agenda')}
                    className="btn-secondary"
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={saving}
                  >
                    <Save size={16} />
                    {saving ? 'Registrando...' : 'Registrar Consulta'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* Success Toast */}
        {showSuccessToast && (
          <div className="toast-success-message">
            <CheckCircle size={22} />
            <span>Consulta registrada com sucesso!</span>
          </div>
        )}
      </main>
    </div>
  );
};

export default Appointments;
