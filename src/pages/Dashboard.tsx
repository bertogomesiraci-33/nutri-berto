import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Flower, 
  Users, 
  Calendar, 
  AlertCircle, 
  LayoutDashboard, 
  LogOut, 
  ChevronRight 
} from 'lucide-react';

interface PacienteSemRetorno {
  id: string;
  nome: string;
  diasSemConsulta: number;
  dataUltimaConsulta: string;
}

const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [totalPacientes, setTotalPacientes] = useState<number>(0);
  const [consultasSemana, setConsultasSemana] = useState<number>(0);
  const [pacientesSemRetorno, setPacientesSemRetorno] = useState<PacienteSemRetorno[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab] = useState<'dashboard'>('dashboard');

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    }
  };

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    
    try {
      // 1. Obter total de pacientes cadastrados da nutricionista
      const { count: pacientesCount, error: pacientesError } = await supabase
        .from('pacientes')
        .select('*', { count: 'exact', head: true })
        .eq('nutricionista_id', user.id);
        
      if (pacientesError) throw pacientesError;
      setTotalPacientes(pacientesCount || 0);

      // Obter lista dos pacientes para as consultas subsequentes
      const { data: todosPacientes, error: todosError } = await supabase
        .from('pacientes')
        .select('id, nome')
        .eq('nutricionista_id', user.id);
        
      if (todosError) throw todosError;
      
      if (!todosPacientes || todosPacientes.length === 0) {
        setConsultasSemana(0);
        setPacientesSemRetorno([]);
        setLoading(false);
        return;
      }
      
      const pacienteIds = todosPacientes.map(p => p.id);

      // 2. Obter consultas da semana
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0: Domingo, 1: Segunda, ...
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      const mondayStr = formatDate(monday);
      const sundayStr = formatDate(sunday);

      const { count: consultasCount, error: consultasError } = await supabase
        .from('consultas')
        .select('*', { count: 'exact', head: true })
        .in('paciente_id', pacienteIds)
        .gte('data_consulta', mondayStr)
        .lte('data_consulta', sundayStr);

      if (consultasError) throw consultasError;
      setConsultasSemana(consultasCount || 0);

      // 3. Obter pacientes sem retorno (última consulta há mais de 30 dias e sem retorno futuro)
      const { data: consultas, error: consultasError2 } = await supabase
        .from('consultas')
        .select('paciente_id, data_consulta, proximo_retorno')
        .in('paciente_id', pacienteIds)
        .order('data_consulta', { ascending: false });

      if (consultasError2) throw consultasError2;

      const hojeStr = formatDate(now);
      const semRetornoList: PacienteSemRetorno[] = [];

      todosPacientes.forEach(paciente => {
        const consultasDoPaciente = consultas?.filter(c => c.paciente_id === paciente.id) || [];
        
        if (consultasDoPaciente.length > 0) {
          // Existe pelo menos uma consulta registrada
          const ultimaConsulta = consultasDoPaciente[0];
          
          // Verifica se possui algum retorno agendado no futuro
          const temRetornoFuturo = consultasDoPaciente.some(
            c => c.proximo_retorno && c.proximo_retorno >= hojeStr
          );

          // Se não houver retorno futuro, incluir na lista
          if (!temRetornoFuturo) {
            const dataUltima = new Date(ultimaConsulta.data_consulta + 'T00:00:00');
            const diffTime = now.getTime() - dataUltima.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const partes = ultimaConsulta.data_consulta.split('-');
            const dataFormatada = partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : ultimaConsulta.data_consulta;
            
            semRetornoList.push({
              id: paciente.id,
              nome: paciente.nome,
              diasSemConsulta: diffDays,
              dataUltimaConsulta: dataFormatada
            });
          }
        } else {
          // Paciente sem nenhuma consulta registrada
          semRetornoList.push({
            id: paciente.id,
            nome: paciente.nome,
            diasSemConsulta: 0,
            dataUltimaConsulta: '-'
          });
        }
      });

      setPacientesSemRetorno(semRetornoList);

    } catch (err: any) {
      console.error('Erro ao carregar dados do dashboard:', err);
      setError('Não foi possível carregar os dados em tempo real.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

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
            className={`sidebar-item-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <LayoutDashboard />
            Dashboard
          </button>
          
          <button 
            onClick={() => navigate('/pacientes')} 
            className="sidebar-item-btn"
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
        <section className="welcome-section">
          <h2 className="welcome-title">
            Olá, nutricionista! 
            <Flower style={{ color: 'var(--primary-color)', animation: 'spinSlow 30s linear infinite' }} />
          </h2>
          <p className="welcome-subtitle">Aqui está o resumo dos seus atendimentos e pacientes.</p>
        </section>

        {error && <div className="error-message">{error}</div>}

        <div className="dashboard-grid">
          {/* Card 1: Total de pacientes ativos */}
          <div className="dashboard-card">
            <div className="card-header">
              <span className="card-title">Pacientes Ativos</span>
              <div className="card-icon-container">
                <Users size={20} />
              </div>
            </div>
            {loading ? (
              <div className="skeleton-value skeleton"></div>
            ) : (
              <h3 className="card-value">{totalPacientes}</h3>
            )}
            <span className="card-subtitle">Cadastrados sob sua supervisão</span>
          </div>

          {/* Card 2: Consultas da semana */}
          <div className="dashboard-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/consultas')}>
            <div className="card-header">
              <span className="card-title">Consultas da Semana</span>
              <div className="card-icon-container">
                <Calendar size={20} />
              </div>
            </div>
            {loading ? (
              <div className="skeleton-value skeleton"></div>
            ) : (
              <h3 className="card-value">{consultasSemana}</h3>
            )}
            <span className="card-subtitle">Agendadas para esta semana</span>
          </div>

          {/* Card 3: Pacientes sem retorno */}
          <div className="dashboard-card card-no-return">
            <div className="card-header">
              <span className="card-title">Pacientes sem retorno</span>
              <div className="card-icon-container" style={{ backgroundColor: '#fff5f5', color: '#c62828' }}>
                <AlertCircle size={20} />
              </div>
            </div>
            
            {loading ? (
              <div className="no-return-list">
                <div className="skeleton-text skeleton" style={{ width: '90%', height: '50px', borderRadius: '12px' }}></div>
                <div className="skeleton-text skeleton" style={{ width: '90%', height: '50px', borderRadius: '12px' }}></div>
              </div>
            ) : pacientesSemRetorno.length === 0 ? (
              <div className="no-return-empty">
                <Flower size={40} />
                <p>Nenhum paciente sem retorno no momento</p>
              </div>
            ) : (
              <>
                <p className="card-subtitle" style={{ marginBottom: '12px' }}>
                  Última consulta há mais de 30 dias e sem retorno agendado:
                </p>
                <div className="no-return-list">
                  {pacientesSemRetorno.map(paciente => (
                    <Link 
                      key={paciente.id} 
                      to={`/pacientes/${paciente.id}`} 
                      className="no-return-item"
                    >
                      <div>
                        <span className="no-return-name">{paciente.nome}</span>
                        <div className="no-return-details">
                          Última consulta: {paciente.dataUltimaConsulta} ({paciente.diasSemConsulta} dias atrás)
                        </div>
                      </div>
                      <ChevronRight size={18} />
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
