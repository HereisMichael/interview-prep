import { useState, useEffect } from 'react';
import { Layout, Menu, Drawer, Button } from 'antd';
import {
  BookOutlined,
  VideoCameraOutlined,
  EditOutlined,
  BugOutlined,
  CalendarOutlined,
  SettingOutlined,
  HomeOutlined,
  MenuOutlined,
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

const MOBILE_BREAKPOINT = 768;

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const selectedKey = '/' + (location.pathname.split('/')[1] || '');
  const activeKey = selectedKey === '/' ? '/' : selectedKey;

  const handleNav = (key: string) => {
    navigate(key);
    setDrawerOpen(false);
  };

  const menuContent = (
    <Menu
      mode="inline"
      selectedKeys={[activeKey]}
      items={menuItems}
      onClick={({ key }) => handleNav(key)}
      style={{ borderRight: 'none', marginTop: 8 }}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop: collapsible Sider */}
      {!isMobile && (
        <Sider
          width={220}
          collapsible
          collapsedWidth={80}
          breakpoint="lg"
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
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            AI 面试助手
          </div>
          {menuContent}
        </Sider>
      )}

      {/* Mobile: Drawer navigation */}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          styles={{ body: { padding: 0 } }}
          width={260}
          closable={false}
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
          {menuContent}
        </Drawer>
      )}

      <Layout>
        <Header
          style={{
            background: '#fff',
            borderBottom: '1px solid #f0f0f0',
            padding: isMobile ? '0 12px' : '0 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            height: 56,
          }}
        >
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined style={{ fontSize: 20 }} />}
              onClick={() => setDrawerOpen(true)}
              style={{ padding: 4 }}
            />
          )}
          <h2 style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 600 }}>
            {menuItems.find((m) => m.key === activeKey)?.label || '面试准备工具'}
          </h2>
        </Header>
        <Content
          style={{
            padding: isMobile ? 12 : 24,
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
