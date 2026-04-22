import xml.etree.ElementTree as ET
import csv
import os
from datetime import datetime

# Define file paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # This puts us in the `server` directory
INPUT_FILE = os.path.join(BASE_DIR, 'Dataset', 'BPI Challenge 2017.xes')
OUTPUT_FILE = os.path.join(BASE_DIR, 'Dataset', 'bpi_aggregated_cases.csv')

def strip_ns(tag):
    """Strip XML namespace to make parsing easier."""
    if '}' in tag:
        return tag.split('}', 1)[1]
    return tag

def parse_date(date_str):
    """Parse ISO date strings safely."""
    date_str = date_str.replace('Z', '+00:00')
    try:
        return datetime.fromisoformat(date_str)
    except ValueError:
        # Fallback for older python versions if needed
        import dateutil.parser
        return dateutil.parser.isoparse(date_str)

def get_priority(amount):
    """Bin the RequestedAmount into a priority tier."""
    try:
        amt = float(amount)
        if amt < 10000: return 'Low'
        if amt < 25000: return 'Medium'
        return 'High'
    except:
        return 'Medium'

def process_xes():
    print(f"Starting parsing of {INPUT_FILE}...")
    
    # Open CSV for writing
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            'caseId', 'createdAt', 'completedAt', 'cycleTimeHours',
            'revisionCount', 'rejectionCount', 'stageCount',
            'status', 'priority', 'departmentId'
        ])
        
        context = ET.iterparse(INPUT_FILE, events=('start', 'end'))
        
        in_trace = False
        in_event = False
        case_data = {}
        current_event_data = {}
        traces_processed = 0
        
        for event, elem in context:
            tag = strip_ns(elem.tag)
            
            if event == 'start':
                if tag == 'trace':
                    in_trace = True
                    case_data = {
                        'caseId': None,
                        'amount': 0,
                        'events': []
                    }
                elif tag == 'event':
                    in_event = True
                    current_event_data = {}
                    
            elif event == 'end':
                if tag == 'trace':
                    # Trace finished, calculate aggregates
                    if case_data['events'] and case_data['caseId']:
                        # Sort events chronologically to be safe
                        events = sorted(case_data['events'], key=lambda x: x['timestamp'])
                        
                        created_at = events[0]['timestamp']
                        completed_at = events[-1]['timestamp']
                        
                        # Time delta in hours
                        cycle_time_hours = (completed_at - created_at).total_seconds() / 3600.0
                        
                        # Counts
                        o_create_offer_count = sum(1 for e in events if e['name'] == 'O_Create Offer')
                        revision_count = max(0, o_create_offer_count - 1)
                        rejection_count = sum(1 for e in events if e['name'] in ('O_Refused', 'A_Denied'))
                        
                        # Unique W_ activities
                        w_activities = set(e['name'] for e in events if e['name'].startswith('W_'))
                        stage_count = len(w_activities)
                        
                        # Determine status based on chronologically last A_* event
                        a_events = [e for e in events if e['name'].startswith('A_')]
                        status = 'pending'
                        if a_events:
                            last_a_event = a_events[-1]['name']
                            if last_a_event in ('A_Denied', 'A_Cancelled'):
                                status = 'rejected'
                            elif last_a_event in ('A_Complete', 'A_Accepted'):
                                status = 'approved'
                                
                        priority = get_priority(case_data.get('amount', 0))
                        
                        # Resource of the very first event
                        resource = events[0].get('resource', 'Unknown')
                        
                        writer.writerow([
                            case_data['caseId'],
                            created_at.isoformat(),
                            completed_at.isoformat(),
                            round(cycle_time_hours, 2),
                            revision_count,
                            rejection_count,
                            stage_count,
                            status,
                            priority,
                            resource
                        ])
                        
                        traces_processed += 1
                        if traces_processed % 5000 == 0:
                            print(f"Processed {traces_processed} cases...")
                            
                    in_trace = False
                    elem.clear() # Free memory
                    
                elif tag == 'event':
                    if in_trace and current_event_data.get('timestamp') and current_event_data.get('name'):
                        case_data['events'].append(current_event_data)
                    in_event = False
                    elem.clear()
                    
                else:
                    # Capture data fields
                    key = elem.get('key')
                    value = elem.get('value')
                    
                    if key and value:
                        if in_event:
                            if key == 'concept:name':
                                current_event_data['name'] = value
                            elif key == 'time:timestamp':
                                try:
                                    current_event_data['timestamp'] = parse_date(value)
                                except Exception as e:
                                    pass
                            elif key == 'org:resource':
                                current_event_data['resource'] = value
                        elif in_trace and not in_event:
                            if key == 'concept:name':
                                case_data['caseId'] = value
                            elif key == 'RequestedAmount':
                                case_data['amount'] = value
                                
                    # Always clear non-essential elements to maintain streaming memory efficiency
                    elem.clear()
                    
    print(f"Finished! Processed {traces_processed} cases total.")
    print(f"Output saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    process_xes()
