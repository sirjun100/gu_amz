import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
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
  Settings,
  Archive,
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'

const navItems = [
  { icon: ListTodo, label: '任务中心', path: '/tasks' },
  { icon: Smartphone, label: '设备管理', path: '/devices' },
  { icon: Shuffle, label: '随机关键词', path: '/keywords' },
  { icon: MousePointerClick, label: '搜索产品点击', path: '/tasks/search-click' },
  { icon: Link2, label: '相关产品点击', path: '/tasks/related-click' },
  { icon: Copy, label: '同类产品点击', path: '/tasks/similar-click' },
  { icon: UserPlus, label: '自动注册任务', path: '/tasks/register' },
  { icon: Archive, label: '任务数据归档', path: '/tasks/saved-records' },
  { icon: MapPin, label: '地址管理', path: '/addresses' },
  { icon: ScanBarcode, label: '目标 ASIN', path: '/target-asins' },
  { icon: ListTree, label: 'ASIN 点击记录', path: '/asin-click-records' },
  { icon: Settings, label: '系统设置', path: '/settings' },
  { icon: FileJson2, label: '上报日志解析', path: '/tools/task-report-parse' },
]

export function Sidebar() {
  const { sidebarCollapsed, sidebarMobileOpen, setSidebarMobileOpen, setSidebarCollapsed } = useUIStore()

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

  const NavItemComponent = ({ item }: { item: (typeof navItems)[0] }) => {
    const Icon = item.icon
    const showLabel = sidebarMobileOpen || !sidebarCollapsed
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
          {navItems.map((item) => (
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
