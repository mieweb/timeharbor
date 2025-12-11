'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ColDef, ICellRendererParams, ValueFormatterParams, ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import { getTimesheetData } from '@/lib/actions/timesheet'

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns'

interface Ticket {
  title: string
  status: string
}

interface ClockEventTicket {
  ticket_id: string
  tickets: Ticket
}

interface ClockEvent {
  id: string
  start_timestamp: string
  end_timestamp: string | null
  accumulated_time: number
  teams: {
    name: string
  }
  clock_event_tickets: ClockEventTicket[]
}

export default function PersonalTimesheetGrid() {
  const [startDate, setStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))
  const [selectedPreset, setSelectedPreset] = useState('thisweek')
  const [rowData, setRowData] = useState<ClockEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Calculate ISO strings on client to handle timezone correctly
      const startIso = startOfDay(parseISO(startDate)).toISOString()
      const endIso = endOfDay(parseISO(endDate)).toISOString()
      
      const { data, error } = await getTimesheetData(startIso, endIso)

      if (error) {
        throw new Error(error)
      }

      setRowData(data || [])
    } catch (error: any) {
      console.error('Error fetching timesheet:', error.message || error)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePresetChange = (preset: string) => {
    const now = new Date()
    let start = now
    let end = now

    switch (preset) {
      case 'today':
        start = startOfDay(now)
        end = endOfDay(now)
        break
      case 'yesterday':
        start = startOfDay(subDays(now, 1))
        end = endOfDay(subDays(now, 1))
        break
      case 'last7days':
        start = subDays(now, 6)
        end = endOfDay(now)
        break
      case 'thisweek':
        start = startOfWeek(now, { weekStartsOn: 1 })
        end = endOfWeek(now, { weekStartsOn: 1 })
        break
      case 'last14days':
        start = subDays(now, 13)
        end = endOfDay(now)
        break
      case 'thismonth':
        start = startOfMonth(now)
        end = endOfMonth(now)
        break
    }

    setStartDate(format(start, 'yyyy-MM-dd'))
    setEndDate(format(end, 'yyyy-MM-dd'))
    setSelectedPreset(preset)
  }

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}h ${m}m`
  }

  const columnDefs = useMemo<ColDef[]>(() => [
    { 
      headerName: 'Date', 
      field: 'start_timestamp', 
      flex: 1, 
      sortable: true, 
      filter: 'agDateColumnFilter',
      valueFormatter: (params: ValueFormatterParams) => {
        if (!params.value) return '';
        return format(new Date(params.value), 'M/d/yyyy');
      },
      cellClass: 'font-medium'
    },
    { 
      headerName: 'Clock-in', 
      field: 'start_timestamp', 
      flex: 1, 
      sortable: true, 
      filter: 'agDateColumnFilter',
      valueFormatter: (params: ValueFormatterParams) => {
        if (!params.value) return 'No clock-in';
        return format(new Date(params.value), 'h:mm a');
      },
      cellClass: 'font-medium'
    },
    { 
      headerName: 'Clock-out', 
      field: 'end_timestamp', 
      flex: 1, 
      sortable: true, 
      filter: 'agDateColumnFilter',
      valueFormatter: (params: ValueFormatterParams) => {
        if (!params.value) return 'Not clocked out';
        return format(new Date(params.value), 'h:mm a');
      },
      cellClass: 'font-medium'
    },
    { 
      headerName: 'Duration', 
      field: 'accumulated_time', 
      flex: 1, 
      sortable: true, 
      filter: 'agNumberColumnFilter',
      valueGetter: (params) => {
        if (!params.data.end_timestamp && params.data.start_timestamp) {
            // Running
            return null; 
        }
        return params.data.accumulated_time;
      },
      valueFormatter: (params: ValueFormatterParams) => {
        if (params.value === null && !params.data.end_timestamp) return 'Running...';
        return formatDuration(params.value || 0);
      },
      cellClass: (params) => !params.data.end_timestamp ? 'text-th-accent font-medium' : 'font-medium',
    },
    { 
      headerName: 'Ticket', 
      field: 'clock_event_tickets', 
      flex: 2, 
      sortable: true, 
      filter: 'agTextColumnFilter',
      valueFormatter: (params: ValueFormatterParams) => {
        const tickets = params.value?.map((t: ClockEventTicket) => t.tickets?.title).filter(Boolean) || [];
        return tickets.length > 0 ? tickets.join(', ') : 'No activity';
      },
      cellClass: 'font-medium',
      tooltipField: 'activityTitle'
    },
    { 
      headerName: 'Team', 
      field: 'teams.name', 
      flex: 1, 
      sortable: true, 
      filter: 'agTextColumnFilter',
      valueFormatter: (params: ValueFormatterParams) => params.value || 'No team',
      cellClass: (params) => params.value ? 'text-th-accent' : 'font-medium',
    },
    { 
      headerName: 'Status', 
      field: 'end_timestamp', 
      flex: 1, 
      sortable: true, 
      cellRenderer: (params: ICellRendererParams) => {
        const isActive = !params.value;
        return isActive ? (
          <span className="text-success font-bold">Active</span>
        ) : (
          <span className="text-base-content opacity-60">Closed</span>
        );
      }
    }
  ], []);

  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true
  }), []);

  // Cast to any to avoid TS errors with React 19
  const Grid = AgGridReact as any;

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-base-100 p-4 rounded-lg border border-base-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Date Range:</span>
            <input 
              type="date" 
              className="input input-bordered input-sm" 
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setSelectedPreset('custom')
              }}
            />
            <span className="opacity-60 text-sm">to</span>
            <input 
              type="date" 
              className="input input-bordered input-sm" 
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setSelectedPreset('custom')
              }}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-sm btn-outline hover:bg-th-accent hover:border-th-accent hover:text-white" onClick={fetchData}>Apply</button>
            {[
              { label: 'Today', value: 'today' },
              { label: 'This Week', value: 'thisweek' },
              { label: 'Last 14 Days', value: 'last14days' }
            ].map((preset) => (
              <button 
                key={preset.value}
                className={`btn btn-sm ${selectedPreset === preset.value ? 'bg-th-accent text-white border-th-accent hover:bg-th-accent/90 hover:border-th-accent/90' : 'btn-outline hover:bg-th-accent hover:border-th-accent hover:text-white'}`}
                onClick={() => handlePresetChange(preset.value)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        
        <button className="btn btn-square btn-sm btn-ghost border border-base-300" title="Refresh" onClick={fetchData}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
        </button>
      </div>

      {/* Grid Section */}
      <div className="w-full h-[600px]">
        <Grid
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination={true}
          paginationPageSize={20}
          theme={themeQuartz}
          animateRows={true}
          overlayLoadingTemplate={'<span class="ag-overlay-loading-center">Loading...</span>'}
          overlayNoRowsTemplate={'<span class="ag-overlay-loading-center">No records found</span>'}
        />
      </div>
    </div>
  )
}
