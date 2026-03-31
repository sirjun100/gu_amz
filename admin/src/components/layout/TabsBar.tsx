import { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { X, Home } from 'lucide-react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { cn } from '@/utils/cn'

interface Tab {
  path: string
  title: string
  closable: boolean
}

interface TabsStore {
  tabs: Tab[]
  activeTab: string
  addTab: (tab: Tab) => void
  removeTab: (path: string) => void
  setActiveTab: (path: string) => void
}

const routeTitles: Record<string, string> = {
  '/tasks': '任务中心',
  '/devices': '设备管理',
  '/keywords': '随机关键词',
  '/tasks/search-click': '搜索产品点击',
  '/tasks/related-click': '相关产品点击',
  '/tasks/similar-click': '同类产品点击',
  '/tasks/register': '自动注册任务',
  '/tasks/saved-records': '任务数据归档',
  '/addresses': '地址管理',
  '/settings': '系统设置',
  '/tools/task-report-parse': '上报日志解析',
}

const HOME_PATH = '/tasks'

export const useTabsStore = create<TabsStore>()(
  persist(
    (set, get) => ({
      tabs: [{ path: HOME_PATH, title: '任务中心', closable: false }],
      activeTab: HOME_PATH,

      addTab: (tab) => {
        const { tabs } = get()
        const exists = tabs.find((t) => t.path === tab.path)
        if (!exists) {
          set({ tabs: [...tabs, tab], activeTab: tab.path })
        } else {
          set({ activeTab: tab.path })
        }
      },

      removeTab: (path) => {
        const { tabs, activeTab } = get()
        const newTabs = tabs.filter((t) => t.path !== path)
        if (activeTab === path && newTabs.length > 0) {
          set({ tabs: newTabs, activeTab: newTabs[newTabs.length - 1].path })
        } else {
          set({ tabs: newTabs })
        }
      },

      setActiveTab: (path) => set({ activeTab: path }),
    }),
    {
      name: 'tabs-storage-amz-ops-v2',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  targetPath: string
}

export function TabsBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { tabs, activeTab, addTab, removeTab, setActiveTab } = useTabsStore()
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetPath: '',
  })
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const path = location.pathname
    const title = routeTitles[path]
    if (title) {
      addTab({
        path,
        title,
        closable: path !== HOME_PATH,
      })
    }
  }, [location.pathname, addTab])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu((prev) => ({ ...prev, visible: false }))
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleTabClick = (path: string) => {
    setActiveTab(path)
    navigate(path)
  }

  const handleTabClose = (e: React.MouseEvent, path: string) => {
    e.stopPropagation()
    removeTab(path)
    if (activeTab === path) {
      const remainingTabs = tabs.filter((t) => t.path !== path)
      if (remainingTabs.length > 0) {
        navigate(remainingTabs[remainingTabs.length - 1].path)
      }
    }
  }

  const handleContextMenu = (e: React.MouseEvent, path: string) => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetPath: path,
    })
  }

  const handleCloseCurrentTab = () => {
    const { targetPath } = contextMenu
    if (targetPath !== HOME_PATH) {
      removeTab(targetPath)
      if (activeTab === targetPath) {
        navigate(HOME_PATH)
      }
    }
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  return (
    <>
      <div className="tabs-bar overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max">
          {tabs.map((tab) => (
            <div
              key={tab.path}
              role="presentation"
              onClick={() => handleTabClick(tab.path)}
              onContextMenu={(e) => handleContextMenu(e, tab.path)}
              className={cn(
                activeTab === tab.path ? 'tab-item-active' : 'tab-item',
                'whitespace-nowrap flex-shrink-0'
              )}
            >
              {tab.path === HOME_PATH && <Home className="w-3.5 h-3.5" />}
              <span className="text-xs sm:text-sm">{tab.title}</span>
              {tab.closable && (
                <button type="button" onClick={(e) => handleTabClose(e, tab.path)} className="tab-close">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {contextMenu.visible && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-md py-0.5 text-xs"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            onClick={handleCloseCurrentTab}
            disabled={contextMenu.targetPath === HOME_PATH}
            className="w-full px-3 py-1 text-left hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            关闭当前
          </button>
        </div>
      )}
    </>
  )
}
