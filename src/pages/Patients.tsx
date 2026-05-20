import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Flower, 
  Users, 
  LayoutDashboard, 
  LogOut, 
  Search, 
  UserPlus, 
  ChevronRight, 
  MessageSquare,
  User,
  Clock,
  Activity,
  HeartPulse,
  X,
  Pencil,
  Calendar
} from 'lucide-react';

interface Paciente {
  id: string;
  nome: string;
  data_nascimento: string | null;
  sexo: string | null;
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
  consultas?: { data_consulta: string }[] | null;
}

const Patients: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [patients, setPatients] = useState<Paciente[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab] = useState<'pacientes'>('pacientes');

  // Estado para o paciente selecionado no modal de resumo
  const [activeSummaryPatient, setActiveSummaryPatient] = useState<Paciente | null>(null);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    }
  };

  const fetchPatients = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: dbError } = await supabase
        .from('pacientes')
        .select('*, consultas(data_consulta)')
        .eq('nutricionista_id', user.id)
        .order('nome', { ascending: true });

      if (dbError) throw dbError;
      setPatients(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar pacientes:', err);
      setError('Não foi possível carregar os pacientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [user]);

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

  // Determinar a data da última consulta
  const getLastConsultationDate = (patient: Paciente) => {
    if (!patient.consultas || patient.consultas.length === 0) return 'Sem consultas';
    
    const dates = patient.consultas.map(c => new Date(c.data_consulta + 'T00:00:00'));
    const latest = new Date(Math.max(...dates.map(d => d.getTime())));
    
    return latest.toLocaleDateString('pt-BR');
  };

  // Obter as iniciais do nome para o avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Formatar link do Whatsapp
  const formatWhatsAppUrl = (phone: string | null) => {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${finalPhone}`;
  };

  // Filtro de busca de pacientes por nome
  const filteredPatients = patients.filter(patient => {
    const term = searchTerm.toLowerCase();
    return patient.nome.toLowerCase().includes(term);
  });

  // Tradução amigável do nível de atividade
  const translateActivityLevel = (level: string | null) => {
    if (!level) return '-';
    switch (level) {
      case 'sedentario':
      case 'Sedentário': return 'Sedentário';
      case 'leve':
      case 'Levemente ativo': return 'Levemente ativo';
      case 'moderado':
      case 'Moderadamente ativo': return 'Moderadamente ativo';
      case 'intenso':
      case 'Muito ativo': return 'Muito ativo';
      case 'Extremamente ativo': return 'Extremamente ativo';
      default: return level;
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
          <button 
            onClick={() => navigate('/dashboard')} 
            className="sidebar-item-btn"
          >
            <LayoutDashboard />
            Dashboard
          </button>
          
          <button 
            onClick={() => navigate('/pacientes')} 
            className={`sidebar-item-btn ${activeTab === 'pacientes' ? 'active' : ''}`}
          >
            <Users />
            Pacientes
          </button>

          <button 
            onClick={() => navigate('/consultas')} 
            className="sidebar-item-btn"
          >
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
            <h2 className="welcome-title">Meus Pacientes</h2>
            <p className="welcome-subtitle">Gerencie os cadastros e acesse o resumo clínico de seus pacientes.</p>
          </div>
          <button 
            onClick={() => navigate('/pacientes/novo')} 
            className="btn-primary"
          >
            <UserPlus size={18} />
            Novo Paciente
          </button>
        </header>

        {error && <div className="error-message">{error}</div>}

        {/* Barra de Filtros */}
        <div className="search-filter-container">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              placeholder="Buscar paciente por nome..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tabela de Pacientes */}
        <div className="patients-table-card">
          {loading ? (
            <div style={{ padding: '24px' }}>
              <div className="skeleton skeleton-text" style={{ width: '100%', height: '40px', borderRadius: '8px', marginBottom: '12px' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '100%', height: '40px', borderRadius: '8px', marginBottom: '12px' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '100%', height: '40px', borderRadius: '8px' }}></div>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="patients-empty-state">
              <Users size={56} />
              <h3 className="patients-empty-title">
                {searchTerm ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado ainda'}
              </h3>
              <p className="patients-empty-subtitle">
                {searchTerm 
                  ? 'Tente ajustar os termos da sua pesquisa ou limpe a busca.' 
                  : 'Comece adicionando seu primeiro paciente clicando no botão no topo da página.'}
              </p>
            </div>
          ) : (
            <div className="patients-table-wrapper">
              <table className="patients-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Objetivo Principal</th>
                    <th>Última Consulta</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map(patient => {
                    const displayObjective = patient.objetivos && patient.objetivos.length > 0 
                      ? patient.objetivos[0] 
                      : (patient.objetivo_texto || '-');

                    return (
                      <tr key={patient.id}>
                        {/* Nome e Avatar - Clicável, redireciona para o Perfil */}
                        <td>
                          <div className="patient-profile-cell">
                            <div className="patient-avatar-circle">
                              {getInitials(patient.nome)}
                            </div>
                            <a 
                              href="#" 
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/pacientes/${patient.id}`);
                              }}
                              className="patient-name-link"
                              style={{ fontWeight: '700' }}
                            >
                              {patient.nome}
                            </a>
                          </div>
                        </td>
                        
                        {/* Objetivo Principal */}
                        <td>
                          <span style={{ 
                            fontSize: '0.875rem', 
                            color: 'var(--text-secondary)',
                            display: 'block',
                            maxWidth: '220px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {displayObjective}
                          </span>
                        </td>

                        {/* Última Consulta */}
                        <td>
                          <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>
                            {getLastConsultationDate(patient)}
                          </span>
                        </td>

                        {/* Ações */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button 
                              type="button"
                              onClick={() => navigate(`/pacientes/${patient.id}`)} 
                              className="table-action-btn"
                              title="Ver perfil completo"
                            >
                              <ChevronRight size={18} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => navigate(`/pacientes/editar/${patient.id}`)} 
                              className="table-action-btn"
                              title="Editar cadastro"
                            >
                              <Pencil size={15} />
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
        </div>

        {/* MODAL DE RESUMO DO PACIENTE */}
        {activeSummaryPatient && (
          <div 
            className="modal-backdrop"
            onClick={() => setActiveSummaryPatient(null)}
          >
            <div 
              className="modal-wrapper"
              onClick={(e) => e.stopPropagation()} 
            >
              <header className="modal-header">
                <div className="modal-title-container">
                  <div className="patient-avatar-circle" style={{ width: '48px', height: '48px', fontSize: '1.1rem' }}>
                    {getInitials(activeSummaryPatient.nome)}
                  </div>
                  <div>
                    <h3 className="modal-title">{activeSummaryPatient.nome}</h3>
                    <p className="modal-subtitle">Resumo da Ficha Cadastral</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="modal-close-btn"
                  onClick={() => setActiveSummaryPatient(null)}
                >
                  <X size={24} />
                </button>
              </header>

              <div className="modal-body">
                {/* 1. DADOS PESSOAIS */}
                <section className="modal-summary-section">
                  <h4 className="modal-section-title">
                    <User size={16} />
                    Dados Pessoais & Contatos
                  </h4>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Idade</span>
                      <span className="summary-value">{calculateAge(activeSummaryPatient.data_nascimento)}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Data de Nascimento</span>
                      <span className="summary-value">{activeSummaryPatient.data_nascimento ? new Date(activeSummaryPatient.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Sexo</span>
                      <span className="summary-value">{activeSummaryPatient.sexo || '-'}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">WhatsApp</span>
                      <span className="summary-value">
                        {activeSummaryPatient.whatsapp ? (
                          <a 
                            href={formatWhatsAppUrl(activeSummaryPatient.whatsapp)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="patient-whatsapp-link"
                          >
                            <MessageSquare size={16} style={{ color: '#25d366' }} />
                            {activeSummaryPatient.whatsapp}
                          </a>
                        ) : (
                          '-'
                        )}
                      </span>
                    </div>
                    <div className="summary-item" style={{ gridColumn: 'span 2' }}>
                      <span className="summary-label">E-mail</span>
                      <span className="summary-value">{activeSummaryPatient.email || '-'}</span>
                    </div>
                  </div>
                </section>

                {/* 2. ROTINA & HÁBITOS */}
                <section className="modal-summary-section">
                  <h4 className="modal-section-title">
                    <Clock size={16} />
                    Rotina & Hábitos Diários
                  </h4>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Horário de Acordar</span>
                      <span className="summary-value">{activeSummaryPatient.horario_acorda || '-'}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Horário de Dormir</span>
                      <span className="summary-value">{activeSummaryPatient.horario_dorme || '-'}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Consumo de Água</span>
                      <span className="summary-value">{activeSummaryPatient.litros_agua ? `${activeSummaryPatient.litros_agua} Litros/dia` : '-'}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Refeições ao Dia</span>
                      <span className="summary-value">{activeSummaryPatient.refeicoes_por_dia ? `${activeSummaryPatient.refeicoes_por_dia} refeições` : '-'}</span>
                    </div>
                    <div className="summary-item" style={{ gridColumn: 'span 2' }}>
                      <span className="summary-label">Atividade Física</span>
                      <span className="summary-value">
                        {activeSummaryPatient.atividade_fisica ? 'Sim' : 'Não'}
                        {activeSummaryPatient.atividade_fisica && activeSummaryPatient.atividade_fisica_descricao && (
                          <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 'normal' }}>
                            ({activeSummaryPatient.atividade_fisica_descricao})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </section>

                {/* 3. AVALIAÇÃO FÍSICA & FOCO */}
                <section className="modal-summary-section">
                  <h4 className="modal-section-title">
                    <Activity size={16} />
                    Avaliação Física & Foco
                  </h4>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Peso Inicial</span>
                      <span className="summary-value">{activeSummaryPatient.peso_inicial ? `${activeSummaryPatient.peso_inicial} kg` : '-'}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Altura</span>
                      <span className="summary-value">{activeSummaryPatient.altura ? `${activeSummaryPatient.altura} cm` : '-'}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Nível de Atividade</span>
                      <span className="summary-value">{translateActivityLevel(activeSummaryPatient.nivel_atividade)}</span>
                    </div>
                    <div className="summary-item" style={{ gridColumn: 'span 3' }}>
                      <span className="summary-label">Objetivos Clínicos</span>
                      <div className="tags-preset-container" style={{ marginTop: '4px' }}>
                        {activeSummaryPatient.objetivos && activeSummaryPatient.objetivos.length > 0 ? (
                          activeSummaryPatient.objetivos.map(tag => (
                            <span key={tag} className="tag-badge">{tag}</span>
                          ))
                        ) : (
                          <span className="summary-value empty">Nenhuma tag cadastrada</span>
                        )}
                      </div>
                    </div>
                    {activeSummaryPatient.objetivo_texto && (
                      <div className="summary-item" style={{ gridColumn: 'span 3' }}>
                        <span className="summary-label">Detalhamento dos Objetivos</span>
                        <pre className="summary-value-text">{activeSummaryPatient.objetivo_texto}</pre>
                      </div>
                    )}
                  </div>
                </section>

                {/* 4. HISTÓRICO CLÍNICO */}
                <section className="modal-summary-section">
                  <h4 className="modal-section-title">
                    <HeartPulse size={16} />
                    Histórico Clínico (Anamnese)
                  </h4>
                  <div className="summary-grid">
                    
                    {/* Patologias */}
                    <div className="summary-item" style={{ gridColumn: 'span 3' }}>
                      <span className="summary-label">Patologias / Diagnósticos Clínicos</span>
                      <div className="tags-preset-container" style={{ marginTop: '4px' }}>
                        {activeSummaryPatient.patologias && activeSummaryPatient.patologias.length > 0 ? (
                          activeSummaryPatient.patologias.map(tag => (
                            <span key={tag} className="tag-badge" style={{ backgroundColor: 'rgba(211, 47, 47, 0.05)', color: 'var(--primary-color)' }}>{tag}</span>
                          ))
                        ) : (
                          <span className="summary-value empty">Nenhuma diagnosticada</span>
                        )}
                      </div>
                    </div>

                    {/* Restrições */}
                    <div className="summary-item" style={{ gridColumn: 'span 3' }}>
                      <span className="summary-label">Restrições Alimentares / Opções</span>
                      <div className="tags-preset-container" style={{ marginTop: '4px' }}>
                        {activeSummaryPatient.restricoes_alimentares && activeSummaryPatient.restricoes_alimentares.length > 0 ? (
                          activeSummaryPatient.restricoes_alimentares.map(tag => (
                            <span key={tag} className="tag-badge" style={{ backgroundColor: '#fafafa', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}>{tag}</span>
                          ))
                        ) : (
                          <span className="summary-value empty">Nenhuma declarada</span>
                        )}
                      </div>
                    </div>

                    {/* Alergias */}
                    <div className="summary-item" style={{ gridColumn: 'span 3' }}>
                      <span className="summary-label">Alergias Alimentares / Intolerâncias</span>
                      <div className="tags-preset-container" style={{ marginTop: '4px' }}>
                        {activeSummaryPatient.alergias && activeSummaryPatient.alergias.length > 0 ? (
                          activeSummaryPatient.alergias.map(tag => (
                            <span key={tag} className="tag-badge" style={{ backgroundColor: '#fff8f8', color: '#b71c1c' }}>{tag}</span>
                          ))
                        ) : (
                          <span className="summary-value empty">Nenhuma declarada</span>
                        )}
                      </div>
                    </div>

                    {/* Medicamentos */}
                    <div className="summary-item" style={{ gridColumn: 'span 3' }}>
                      <span className="summary-label">Medicamentos em Uso</span>
                      {activeSummaryPatient.medicamentos ? (
                        <pre className="summary-value-text">{activeSummaryPatient.medicamentos}</pre>
                      ) : (
                        <span className="summary-value empty">Nenhum</span>
                      )}
                    </div>

                    {/* Suplementos */}
                    <div className="summary-item" style={{ gridColumn: 'span 3' }}>
                      <span className="summary-label">Suplementação em Uso</span>
                      {activeSummaryPatient.suplementos ? (
                        <pre className="summary-value-text">{activeSummaryPatient.suplementos}</pre>
                      ) : (
                        <span className="summary-value empty">Nenhuma</span>
                      )}
                    </div>

                    {/* Observações Gerais */}
                    {activeSummaryPatient.observacoes && (
                      <div className="summary-item" style={{ gridColumn: 'span 3' }}>
                        <span className="summary-label">Observações Clínicas Gerais</span>
                        <pre className="summary-value-text">{activeSummaryPatient.observacoes}</pre>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <footer className="modal-footer" style={{ gap: '12px' }}>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setActiveSummaryPatient(null)}
                >
                  Fechar Resumo
                </button>
                <button 
                  type="button"
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  onClick={() => {
                    const patientId = activeSummaryPatient.id;
                    setActiveSummaryPatient(null);
                    navigate(`/pacientes/editar/${patientId}`);
                  }}
                >
                  <Pencil size={16} />
                  Editar Cadastro
                </button>
              </footer>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Patients;
