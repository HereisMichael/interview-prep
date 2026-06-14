import { Layout, Menu } from 'antd';
import {
  BookOutlined,
  VideoCameraOutlined,
  EditOutlined,
  BugOutlined,
  CalendarOutlined,
  SettingOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

const { Sider, Content, Header } = Layout;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: '首页' },
  { key: '/questions', icon: <BookOutlined />, label: '题库管理' },
  { key: '/interview', icon: <VideoCameraOutlined />, label: '模拟面试' },
  { key: '/practice', icon: <EditOutlined />, label: '刷题' },
  { key: '/review', icon: <BugOutlined />, label: '错题复盘' },
  { key: '/plans', icon: <CalendarOutlined />, label: '面试计划' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey = '/' + (location.pathname.split('/')[1] || '');
  const activeKey = selectedKey === '/' ? '/' : selectedKey;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={220}
        style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
            fontWeight: 700,
            fontSize: 18,
            color: '#1677ff',
          }}
        >
          AI 面试助手
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 'none', marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            borderBottom: '1px solid #f0f0f0',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            height: 64,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            {menuItems.find((m) => m.key === activeKey)?.label || '面试准备工具'}
          </h2>
        </Header>
        <Content
          style={{
            padding: 24,
            background: '#f5f5f5',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
