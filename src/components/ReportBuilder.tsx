"use client";
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaGripVertical, FaTrash, FaPlus, FaDownload } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

interface ReportElement {
  id: string;
  type: 'metric' | 'chart' | 'table';
  title: string;
  data?: unknown;
  config?: unknown;
}

interface ReportBuilderProps {
  availableElements: ReportElement[];
  onSave?: (report: ReportElement[]) => void;
}

function SortableItem({ element, onRemove }: { element: ReportElement; onRemove: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
    >
      <div {...attributes} {...listeners} className="cursor-grab">
        <FaGripVertical className="w-4 h-4 text-gray-400" />
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-gray-800">{element.title}</h4>
        <p className="text-sm text-gray-600 capitalize">{element.type}</p>
      </div>
      <button
        onClick={() => onRemove(element.id)}
        className="p-1 text-red-600 hover:text-red-800"
      >
        <FaTrash className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function ReportBuilder({ availableElements, onSave }: ReportBuilderProps) {
  const [reportElements, setReportElements] = useState<ReportElement[]>([]);
  const [reportTitle, setReportTitle] = useState('Custom Report');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addElement = (element: ReportElement) => {
    setReportElements(prev => [...prev, { ...element, id: `${element.id}-${Date.now()}` }]);
  };

  const removeElement = (id: string) => {
    setReportElements(prev => prev.filter(el => el.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setReportElements((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const exportAsPDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;

    doc.setFontSize(20);
    doc.text(reportTitle, 20, yPosition);
    yPosition += 20;

    reportElements.forEach((element, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.text(`${index + 1}. ${element.title}`, 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.text(`Type: ${element.type}`, 30, yPosition);
      yPosition += 15;
    });

    doc.save(`${reportTitle.replace(/\s+/g, '_')}.pdf`);
  };

  const exportAsExcel = () => {
    const workbook = XLSX.utils.book_new();

    reportElements.forEach((element) => {
      const worksheet = XLSX.utils.json_to_sheet(element.data || []);
      XLSX.utils.book_append_sheet(workbook, worksheet, element.title.substring(0, 31));
    });

    XLSX.writeFile(workbook, `${reportTitle.replace(/\s+/g, '_')}.xlsx`);
  };

  const saveReport = () => {
    if (onSave) {
      onSave(reportElements);
    }
    // Also save to localStorage for persistence
    localStorage.setItem('customReport', JSON.stringify({
      title: reportTitle,
      elements: reportElements,
      createdAt: new Date().toISOString(),
    }));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Report Builder</h2>
        <div className="flex gap-2">
          <button
            onClick={exportAsPDF}
            className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            <FaDownload className="w-4 h-4 inline mr-1" />
            PDF
          </button>
          <button
            onClick={exportAsExcel}
            className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            <FaDownload className="w-4 h-4 inline mr-1" />
            Excel
          </button>
          <button
            onClick={saveReport}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Save Report
          </button>
        </div>
      </div>

      {/* Report Title */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Report Title
        </label>
        <input
          type="text"
          value={reportTitle}
          onChange={(e) => setReportTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Elements */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">Available Elements</h3>
          <div className="space-y-2">
            {availableElements.map((element) => (
              <div
                key={element.id}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <div>
                  <h4 className="font-medium text-gray-800">{element.title}</h4>
                  <p className="text-sm text-gray-600 capitalize">{element.type}</p>
                </div>
                <button
                  onClick={() => addElement(element)}
                  className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <FaPlus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Report Canvas */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">Report Layout</h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={reportElements.map(el => el.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 min-h-[200px] border-2 border-dashed border-gray-300 rounded-lg p-4">
  {reportElements.length === 0 ? (
    <p className="text-gray-500 text-center py-8">
      Drag elements here to build your report
    </p>
  ) : (
    reportElements.map((element) => (
      <SortableItem
        key={element.id}
        element={element}
        onRemove={removeElement}
      />
    ))
  )}
</div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
