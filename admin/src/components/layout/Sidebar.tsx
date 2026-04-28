import { useEffect, useRef, useState, useCallback } from 'react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ListTodo,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  Boxes,
  Smartphone,
  Shuffle,
  MousePointerClick,
  Link2,
  Copy,
  UserPlus,
  MapPin,
  ScanBarcode,
  ListTree,
  FileJson2,
  Crosshair,
  Settings,
  Archive,
  Megaphone,
  ChevronRight,
  Package,
  Phone,
  Mail,
  LayoutDashboard,
  Users,
  ShieldCheck,
  BarChart3,
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'

type NavItem = { icon: LucideIcon; label: string; path: string }

const taskHallChildren: NavItem[] = [
  { icon: ListTodo, label: '任务中心', path: '/tasks' },
  { icon: Smartphone, label: '设备管理', path: '/devices' },
  { icon: Archive, label: '任务数据归档', path: '/tasks/saved-records' },
]

function isTaskHallRoute(pathname: string): boolean {
  const p = pathname.replace(/\/$/, '') || '/'
  if (p === '/tasks') return true
  if (p === '/devices' || p.startsWith('/devices/')) return true
  if (p === '/tasks/saved-records' || p.startsWith('/tasks/saved-records/')) return true
  return false
}

const adClickChildren: NavItem[] = [
  { icon: Shuffle, label: '随机关键词', path: '/keywords' },
  { icon: MousePointerClick, label: '搜索产品点击', path: '/tasks/search-click' },
  { icon: Link2, label: '相关产品点击', path: '/tasks/related-click' },
  { icon: Copy, label: '同类产品点击', path: '/tasks/similar-click' },
  { icon: ScanBarcode, label: '目标 ASIN', path: '/target-asins' },
  { icon: BarChart3, label: '关键词点击统计', path: '/keyword-click-stats' },
  { icon: ListTree, label: 'ASIN 点击记录', path: '/asin-click-records' },
]

const AD_CLICK_PATHS = adClickChildren.map((c) => c.path)

function isAdClickRoute(pathname: string): boolean {
  return AD_CLICK_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

const resourceChildren: NavItem[] = [
  { icon: Phone, label: '手机接码管理', path: '/resources/phone-pool' },
  { icon: Mail, label: '邮箱接码管理', path: '/resources/email-pool' },
  { icon: MapPin, label: '地址管理', path: '/addresses' },
]

const RESOURCE_PATHS = resourceChildren.map((c) => c.path)

function isResourceRoute(pathname: string): boolean {
  return RESOURCE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

const autoRegisterChildren: NavItem[] = [
  { icon: UserPlus, label: '创建亚马逊注册任务', path: '/tasks/register' },
  { icon: ShieldCheck, label: '亚马逊账号管理', path: '/auto-register/amazon-accounts' },
]

function isAutoRegisterRoute(pathname: string): boolean {
  const p = pathname.replace(/\/$/, '') || '/'
  return (
    p === '/tasks/register' ||
    p.startsWith('/tasks/register/') ||
    p === '/auto-register/amazon-accounts' ||
    p.startsWith('/auto-register/amazon-accounts/')
  )
}

const restNavItems: NavItem[] = [
  { icon: Settings, label: '系统设置', path: '/settings' },
  { icon: FileJson2, label: '上报日志解析', path: '/tools/task-report-parse' },
  { icon: Crosshair, label: '人工验证码协助', path: '/tools/captcha-assist' },
]

export function Sidebar() {
  const location = useLocation()
  const { sidebarCollapsed, sidebarMobileOpen, setSidebarMobileOpen, setSidebarCollapsed } = useUIStore()

  const [taskHallSectionOpen, setTaskHallSectionOpen] = useState(() => isTaskHallRoute(location.pathname))
  const [adSectionOpen, setAdSectionOpen] = useState(() => isAdClickRoute(location.pathname))
  const [resourceSectionOpen, setResourceSectionOpen] = useState(() => isResourceRoute(location.pathname))
  const [autoRegisterSectionOpen, setAutoRegisterSectionOpen] = useState(() =>
    isAutoRegisterRoute(location.pathname)
  )

  const [taskHallFlyoutOpen, setTaskHallFlyoutOpen] = useState(false)
  const [adFlyoutOpen, setAdFlyoutOpen] = useState(false)
  const [resourceFlyoutOpen, setResourceFlyoutOpen] = useState(false)
  const [autoRegisterFlyoutOpen, setAutoRegisterFlyoutOpen] = useState(false)
  const [taskHallFlyoutTop, setTaskHallFlyoutTop] = useState(0)
  const [adFlyoutTop, setAdFlyoutTop] = useState(0)
  const [resourceFlyoutTop, setResourceFlyoutTop] = useState(0)
  const [autoRegisterFlyoutTop, setAutoRegisterFlyoutTop] = useState(0)
  const taskHallGroupBtnRef = useRef<HTMLButtonElement>(null)
  const adGroupBtnRef = useRef<HTMLButtonElement>(null)
  const resourceGroupBtnRef = useRef<HTMLButtonElement>(null)
  const autoRegisterGroupBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isTaskHallRoute(location.pathname)) {
      setTaskHallSectionOpen(true)
    }
  }, [location.pathname])

  useEffect(() => {
    if (isAdClickRoute(location.pathname)) {
      setAdSectionOpen(true)
    }
  }, [location.pathname])

  useEffect(() => {
    if (isResourceRoute(location.pathname)) {
      setResourceSectionOpen(true)
    }
  }, [location.pathname])

  useEffect(() => {
    if (isAutoRegisterRoute(location.pathname)) {
      setAutoRegisterSectionOpen(true)
    }
  }, [location.pathname])

  useEffect(() => {
    setTaskHallFlyoutOpen(false)
    setAdFlyoutOpen(false)
    setResourceFlyoutOpen(false)
    setAutoRegisterFlyoutOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width >= 640 && width < 1024) {
        setSidebarCollapsed(true)
      } else if (width >= 1024) {
        setSidebarCollapsed(false)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setSidebarCollapsed])

  const showLabel = sidebarMobileOpen || !sidebarCollapsed

  const updateTaskHallFlyoutPosition = useCallback(() => {
    const el = taskHallGroupBtnRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      setTaskHallFlyoutTop(r.top)
    }
  }, [])

  const updateAdFlyoutPosition = useCallback(() => {
    const el = adGroupBtnRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      setAdFlyoutTop(r.top)
    }
  }, [])

  const updateResourceFlyoutPosition = useCallback(() => {
    const el = resourceGroupBtnRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      setResourceFlyoutTop(r.top)
    }
  }, [])

  const updateAutoRegisterFlyoutPosition = useCallback(() => {
    const el = autoRegisterGroupBtnRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      setAutoRegisterFlyoutTop(r.top)
    }
  }, [])

  const openTaskHallFlyout = () => {
    setAdFlyoutOpen(false)
    setResourceFlyoutOpen(false)
    setAutoRegisterFlyoutOpen(false)
    updateTaskHallFlyoutPosition()
    setTaskHallFlyoutOpen((v) => !v)
  }

  const openAdFlyout = () => {
    setTaskHallFlyoutOpen(false)
    setResourceFlyoutOpen(false)
    setAutoRegisterFlyoutOpen(false)
    updateAdFlyoutPosition()
    setAdFlyoutOpen((v) => !v)
  }

  const openResourceFlyout = () => {
    setTaskHallFlyoutOpen(false)
    setAdFlyoutOpen(false)
    setAutoRegisterFlyoutOpen(false)
    updateResourceFlyoutPosition()
    setResourceFlyoutOpen((v) => !v)
  }

  const openAutoRegisterFlyout = () => {
    setTaskHallFlyoutOpen(false)
    setAdFlyoutOpen(false)
    setResourceFlyoutOpen(false)
    updateAutoRegisterFlyoutPosition()
    setAutoRegisterFlyoutOpen((v) => !v)
  }

  useEffect(() => {
    if (!taskHallFlyoutOpen) return
    const onScroll = () => updateTaskHallFlyoutPosition()
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [taskHallFlyoutOpen, updateTaskHallFlyoutPosition])

  useEffect(() => {
    if (!adFlyoutOpen) return
    const onScroll = () => updateAdFlyoutPosition()
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [adFlyoutOpen, updateAdFlyoutPosition])

  useEffect(() => {
    if (!resourceFlyoutOpen) return
    const onScroll = () => updateResourceFlyoutPosition()
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [resourceFlyoutOpen, updateResourceFlyoutPosition])

  useEffect(() => {
    if (!autoRegisterFlyoutOpen) return
    const onScroll = () => updateAutoRegisterFlyoutPosition()
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [autoRegisterFlyoutOpen, updateAutoRegisterFlyoutPosition])

  const closeAllFlyouts = () => {
    setTaskHallFlyoutOpen(false)
    setAdFlyoutOpen(false)
    setResourceFlyoutOpen(false)
    setAutoRegisterFlyoutOpen(false)
  }

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const Icon = item.icon
    return (
      <NavLink
        to={item.path}
        end={item.path === '/tasks'}
        onClick={() => setSidebarMobileOpen(false)}
        title={!showLabel ? item.label : undefined}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150',
            !showLabel && 'justify-center px-2',
            isActive
              ? 'bg-blue-600 text-white dark:text-white hover:text-white hover:bg-blue-700 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
          )
        }
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {showLabel && <span className="truncate">{item.label}</span>}
      </NavLink>
    )
  }

  const groupChildLinkClass = (isActive: boolean) =>
    cn(
      'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-150',
      isActive
        ? 'bg-blue-600 text-white dark:text-white hover:bg-blue-700'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
    )

  const taskHallGroupActive = isTaskHallRoute(location.pathname)
  const adGroupActive = isAdClickRoute(location.pathname)
  const resourceGroupActive = isResourceRoute(location.pathname)
  const autoRegisterGroupActive = isAutoRegisterRoute(location.pathname)
  const narrowFlyoutOpen =
    !showLabel &&
    (taskHallFlyoutOpen || adFlyoutOpen || resourceFlyoutOpen || autoRegisterFlyoutOpen)

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: sidebarMobileOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'fixed inset-0 bg-black/60 z-40 sm:hidden',
          sidebarMobileOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        onClick={() => setSidebarMobileOpen(false)}
      />

      <motion.aside
        initial={false}
        className={cn(
          'fixed top-0 left-0 h-screen z-50',
          'bg-white dark:bg-[#001529]',
          'flex flex-col',
          'transition-transform duration-200 ease-out',
          'border-r border-slate-200 dark:border-slate-700',
          sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0',
          sidebarMobileOpen ? 'w-72' : sidebarCollapsed ? 'w-16' : 'w-56'
        )}
      >
        <div
          className={cn(
            'h-14 flex items-center border-b border-slate-200 dark:border-slate-700',
            !sidebarMobileOpen && sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
              <Boxes className="w-4 h-4 text-white" />
            </div>
            {(sidebarMobileOpen || !sidebarCollapsed) && (
              <span className="font-semibold text-sm text-slate-900 dark:text-white whitespace-nowrap">
                亚马逊运维
              </span>
            )}
          </div>
          {sidebarMobileOpen && (
            <button
              type="button"
              onClick={() => setSidebarMobileOpen(false)}
              className="sm:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded transition-colors text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav
          className={cn(
            'flex-1 overflow-y-auto py-3 space-y-0.5',
            !sidebarMobileOpen && sidebarCollapsed ? 'px-1.5' : 'px-2'
          )}
        >
          {/* 任务大厅 */}
          {showLabel ? (
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setTaskHallSectionOpen((v) => !v)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 text-left',
                  taskHallGroupActive && !taskHallSectionOpen
                    ? 'bg-slate-200/80 dark:bg-white/15 text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                )}
              >
                <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate font-medium">任务大厅</span>
                <ChevronRight
                  className={cn(
                    'w-4 h-4 flex-shrink-0 transition-transform duration-200',
                    taskHallSectionOpen && 'rotate-90'
                  )}
                />
              </button>
              {taskHallSectionOpen && (
                <div className="mt-0.5 ml-1 pl-2 border-l border-slate-200 dark:border-slate-600 space-y-0.5">
                  {taskHallChildren.map((item) => {
                    const Icon = item.icon
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/tasks'}
                        onClick={() => setSidebarMobileOpen(false)}
                        className={({ isActive }) => cn(groupChildLinkClass(isActive), 'pl-2')}
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-90" />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="relative pt-0.5">
              <button
                ref={taskHallGroupBtnRef}
                type="button"
                title="任务大厅"
                onClick={openTaskHallFlyout}
                className={cn(
                  'w-full flex items-center justify-center px-2 py-2.5 rounded-md text-sm transition-all duration-150',
                  taskHallGroupActive || taskHallFlyoutOpen
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 广告点击 */}
          {showLabel ? (
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setAdSectionOpen((v) => !v)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 text-left',
                  adGroupActive && !adSectionOpen
                    ? 'bg-slate-200/80 dark:bg-white/15 text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                )}
              >
                <Megaphone className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate font-medium">广告点击</span>
                <ChevronRight
                  className={cn(
                    'w-4 h-4 flex-shrink-0 transition-transform duration-200',
                    adSectionOpen && 'rotate-90'
                  )}
                />
              </button>
              {adSectionOpen && (
                <div className="mt-0.5 ml-1 pl-2 border-l border-slate-200 dark:border-slate-600 space-y-0.5">
                  {adClickChildren.map((item) => {
                    const Icon = item.icon
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarMobileOpen(false)}
                        className={({ isActive }) => cn(groupChildLinkClass(isActive), 'pl-2')}
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-90" />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="relative pt-0.5">
              <button
                ref={adGroupBtnRef}
                type="button"
                title="广告点击"
                onClick={openAdFlyout}
                className={cn(
                  'w-full flex items-center justify-center px-2 py-2.5 rounded-md text-sm transition-all duration-150',
                  adGroupActive || adFlyoutOpen
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                )}
              >
                <Megaphone className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 资源管理 */}
          {showLabel ? (
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setResourceSectionOpen((v) => !v)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 text-left',
                  resourceGroupActive && !resourceSectionOpen
                    ? 'bg-slate-200/80 dark:bg-white/15 text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                )}
              >
                <Package className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate font-medium">资源管理</span>
                <ChevronRight
                  className={cn(
                    'w-4 h-4 flex-shrink-0 transition-transform duration-200',
                    resourceSectionOpen && 'rotate-90'
                  )}
                />
              </button>
              {resourceSectionOpen && (
                <div className="mt-0.5 ml-1 pl-2 border-l border-slate-200 dark:border-slate-600 space-y-0.5">
                  {resourceChildren.map((item) => {
                    const Icon = item.icon
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarMobileOpen(false)}
                        className={({ isActive }) => cn(groupChildLinkClass(isActive), 'pl-2')}
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-90" />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="relative pt-0.5">
              <button
                ref={resourceGroupBtnRef}
                type="button"
                title="资源管理"
                onClick={openResourceFlyout}
                className={cn(
                  'w-full flex items-center justify-center px-2 py-2.5 rounded-md text-sm transition-all duration-150',
                  resourceGroupActive || resourceFlyoutOpen
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                )}
              >
                <Package className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 自动注册 */}
          {showLabel ? (
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setAutoRegisterSectionOpen((v) => !v)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 text-left',
                  autoRegisterGroupActive && !autoRegisterSectionOpen
                    ? 'bg-slate-200/80 dark:bg-white/15 text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                )}
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate font-medium">自动注册</span>
                <ChevronRight
                  className={cn(
                    'w-4 h-4 flex-shrink-0 transition-transform duration-200',
                    autoRegisterSectionOpen && 'rotate-90'
                  )}
                />
              </button>
              {autoRegisterSectionOpen && (
                <div className="mt-0.5 ml-1 pl-2 border-l border-slate-200 dark:border-slate-600 space-y-0.5">
                  {autoRegisterChildren.map((item) => {
                    const Icon = item.icon
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarMobileOpen(false)}
                        className={({ isActive }) => cn(groupChildLinkClass(isActive), 'pl-2')}
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-90" />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="relative pt-0.5">
              <button
                ref={autoRegisterGroupBtnRef}
                type="button"
                title="自动注册"
                onClick={openAutoRegisterFlyout}
                className={cn(
                  'w-full flex items-center justify-center px-2 py-2.5 rounded-md text-sm transition-all duration-150',
                  autoRegisterGroupActive || autoRegisterFlyoutOpen
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                )}
              >
                <Users className="w-4 h-4" />
              </button>
            </div>
          )}

          {restNavItems.map((item) => (
            <NavItemComponent key={item.path} item={item} />
          ))}
        </nav>

        <div className="hidden lg:flex items-center justify-center p-2 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-white"
            title={sidebarCollapsed ? '展开' : '收起'}
          >
            {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
      </motion.aside>

      {/* 窄栏：分组子菜单浮层 */}
      {narrowFlyoutOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] cursor-default sm:block"
            aria-label="关闭菜单"
            onClick={closeAllFlyouts}
          />
          {taskHallFlyoutOpen && (
            <div
              className={cn(
                'fixed z-[70] w-52 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600',
                'bg-white dark:bg-[#1e293b] shadow-xl',
                'left-16'
              )}
              style={{ top: Math.max(8, taskHallFlyoutTop) }}
            >
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 mb-1">
                任务大厅
              </div>
              {taskHallChildren.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/tasks'}
                    onClick={() => closeAllFlyouts()}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 px-3 py-2 text-sm',
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                      )
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          )}
          {adFlyoutOpen && (
            <div
              className={cn(
                'fixed z-[70] w-52 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600',
                'bg-white dark:bg-[#1e293b] shadow-xl',
                'left-16'
              )}
              style={{ top: Math.max(8, adFlyoutTop) }}
            >
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 mb-1">
                广告点击
              </div>
              {adClickChildren.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => closeAllFlyouts()}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 px-3 py-2 text-sm',
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                      )
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          )}
          {resourceFlyoutOpen && (
            <div
              className={cn(
                'fixed z-[70] w-52 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600',
                'bg-white dark:bg-[#1e293b] shadow-xl',
                'left-16'
              )}
              style={{ top: Math.max(8, resourceFlyoutTop) }}
            >
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 mb-1">
                资源管理
              </div>
              {resourceChildren.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => closeAllFlyouts()}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 px-3 py-2 text-sm',
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                      )
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          )}
          {autoRegisterFlyoutOpen && (
            <div
              className={cn(
                'fixed z-[70] w-56 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600',
                'bg-white dark:bg-[#1e293b] shadow-xl',
                'left-16'
              )}
              style={{ top: Math.max(8, autoRegisterFlyoutTop) }}
            >
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 mb-1">
                自动注册
              </div>
              {autoRegisterChildren.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => closeAllFlyouts()}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 px-3 py-2 text-sm',
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                      )
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          )}
        </>
      )}

      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: sidebarMobileOpen ? 0 : 1,
          scale: sidebarMobileOpen ? 0.9 : 1,
        }}
        transition={{ duration: 0.15 }}
        type="button"
        onClick={() => setSidebarMobileOpen(true)}
        className={cn(
          'fixed top-2.5 left-2.5 z-50 sm:hidden',
          'w-8 h-8 rounded-md',
          'bg-blue-500 text-white shadow-md',
          'flex items-center justify-center',
          'hover:bg-blue-600 active:scale-95 transition-all',
          sidebarMobileOpen && 'pointer-events-none'
        )}
      >
        <Menu className="w-4 h-4" />
      </motion.button>
    </>
  )
}
