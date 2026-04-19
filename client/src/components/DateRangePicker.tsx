import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onFromChange: (date: string) => void;
  onToChange: (date: string) => void;
}

export default function DateRangePicker({
  dateFrom,
  dateTo,
  onFromChange,
  onToChange,
}: DateRangePickerProps) {
  const customInputStyle = {
    background: "white",
    border: "1px solid #E2E8F0",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "13px",
    fontFamily: "'Outfit', sans-serif",
    cursor: "pointer",
    width: "130px",
    outline: "none",
    color: "#334155",
    fontWeight: 500
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">From</label>
        <DatePicker
          selected={dateFrom ? new Date(dateFrom) : null}
          onChange={(date: Date | null) => {
            if (date) onFromChange(date.toISOString().split("T")[0]);
          }}
          dateFormat="dd MMM yyyy"
          showMonthDropdown
          showYearDropdown
          dropdownMode="scroll"
          popperPlacement="bottom-start"
          maxDate={dateTo ? new Date(dateTo) : undefined}
          customInput={<input style={customInputStyle} />}
        />
      </div>
      <span className="text-gray-400 mt-5">-&gt;</span>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">To</label>
        <DatePicker
          selected={dateTo ? new Date(dateTo) : null}
          onChange={(date: Date | null) => {
            if (date) onToChange(date.toISOString().split("T")[0]);
          }}
          dateFormat="dd MMM yyyy"
          showMonthDropdown
          showYearDropdown
          dropdownMode="scroll"
          popperPlacement="bottom-start"
          minDate={dateFrom ? new Date(dateFrom) : undefined}
          customInput={<input style={customInputStyle} />}
        />
      </div>
    </div>
  );
}
