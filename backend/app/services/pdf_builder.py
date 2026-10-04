import base64
import io
import logging
from fpdf import FPDF
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class CardioReportPDF(FPDF):
    def header(self):
        # Arial bold 15
        self.set_font("helvetica", "B", 18)
        # Title
        self.cell(0, 10, "CardioVision3D - Clinical Decision Support Report", border=0, ln=1, align="C")
        self.ln(5)

    def footer(self):
        # Position at 1.5 cm from bottom
        self.set_y(-15)
        # Arial italic 8
        self.set_font("helvetica", "I", 8)
        # Page number
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", 0, 0, "C")

def generate_clinical_report(
    patient_data: Dict[str, Any],
    predictions: Dict[str, Any],
    explanations: List[Dict[str, Any]],
    image_base64: str
) -> bytes:
    """
    Generates a PDF report using fpdf2.
    Returns the PDF as a bytearray (bytes).
    """
    pdf = CardioReportPDF()
    pdf.alias_nb_pages()
    pdf.add_page()

    # Section 1: Patient Profile & Clinical Inputs
    pdf.set_font("helvetica", "B", 14)
    pdf.cell(0, 10, "1. Patient Profile & Clinical Inputs", ln=1)
    
    pdf.set_font("helvetica", "", 9)
    
    # Filter and format clinical fields
    clinical_pairs = []
    for key, value in patient_data.items():
        if value not in [None, ""]:
            clean_key = key.replace('_', ' ').title()
            clinical_pairs.append((clean_key, str(value)))
            
    # Draw a 4-column table (Key | Value | Key | Value)
    col_w = pdf.epw / 4
    row_height = 6
    
    for i in range(0, len(clinical_pairs), 2):
        pair1 = clinical_pairs[i]
        pair2 = clinical_pairs[i+1] if i+1 < len(clinical_pairs) else ("", "")
        
        # Draw Key 1
        pdf.set_font("helvetica", "B", 9)
        pdf.set_fill_color(240, 240, 240) # light gray background
        pdf.cell(col_w, row_height, pair1[0], border=1, fill=True)
        # Draw Value 1
        pdf.set_font("helvetica", "", 9)
        pdf.cell(col_w, row_height, pair1[1], border=1)
        
        # Draw Key 2
        pdf.set_font("helvetica", "B", 9)
        if pair2[0]:
            pdf.cell(col_w, row_height, pair2[0], border=1, fill=True)
        else:
            pdf.cell(col_w, row_height, "", border=1)
            
        # Draw Value 2
        pdf.set_font("helvetica", "", 9)
        pdf.cell(col_w, row_height, pair2[1], border=1, ln=1)
        
    pdf.ln(5)

    # Section 2: Risk Predictions & Vessel Stenosis Results
    pdf.set_font("helvetica", "B", 14)
    pdf.cell(0, 10, "2. Risk Predictions & Vessel Stenosis Results", ln=1)
    
    pdf.set_font("helvetica", "", 11)
    cad_risk = predictions.get("CAD", {}).get("risk_score", 0)
    pdf.set_text_color(220, 53, 69) if cad_risk > 50 else pdf.set_text_color(40, 167, 69)
    pdf.cell(0, 8, f"Overall CAD Risk Score: {cad_risk}%", ln=1)
    pdf.set_text_color(0, 0, 0)
    
    # Vessel specifics
    for vessel in ["LAD", "LCX", "RCA"]:
        vessel_risk = predictions.get(vessel, {}).get("risk_score", 0)
        pdf.cell(0, 8, f"- {vessel} Stenosis Risk: {vessel_risk}%", ln=1)
    pdf.ln(5)

    # Force page break so Explainability and 3D mapping start on a fresh second page
    pdf.add_page()

    # Section 3: Clinical Explainability & Feature Attribution
    pdf.set_font("helvetica", "B", 14)
    pdf.cell(0, 10, "3. Clinical Explainability (Top Contributing Factors)", ln=1)
    
    pdf.set_font("helvetica", "", 11)
    if explanations:
        for item in explanations[:5]: # Show top 5
            feature = item.get("feature", "Unknown")
            impact = item.get("impact", 0)
            pdf.cell(0, 8, f"- {feature}: {impact:.4f} impact", ln=1)
    else:
        pdf.cell(0, 8, "No explainability data provided.", ln=1)
    pdf.ln(5)

    # Section 4: 3D Risk Mapping / Visual Summary
    pdf.set_font("helvetica", "B", 14)
    pdf.cell(0, 10, "4. 3D Risk Mapping (Coronary Arteries)", ln=1)
    
    if image_base64:
        try:
            # Handle standard base64 data URI format (e.g. data:image/png;base64,...)
            if "," in image_base64:
                b64_data = image_base64.split(",")[1]
            else:
                b64_data = image_base64
                
            img_bytes = base64.b64decode(b64_data)
            img_io = io.BytesIO(img_bytes)
            
            # Add a slight border around the image area
            pdf.image(img_io, x=30, w=150)
            pdf.ln(5)
        except Exception as e:
            logger.error(f"Failed to decode or insert Base64 image into PDF: {str(e)}")
            pdf.set_font("helvetica", "I", 11)
            pdf.set_text_color(220, 53, 69)
            pdf.cell(0, 10, "[Note: Real 3D Heart Snapshot will appear here when submitted via Frontend]", ln=1)
            pdf.set_text_color(0, 0, 0)
    else:
        pdf.set_font("helvetica", "I", 11)
        pdf.cell(0, 10, "[No 3D Visualization Provided]", ln=1)

    pdf.ln(10)

    # Section 5: Clinical Safety Disclaimer
    pdf.set_y(-45) # Push to bottom
    pdf.set_font("helvetica", "B", 12)
    pdf.set_text_color(220, 53, 69) # Red color for warning
    pdf.cell(0, 10, "Mandatory Clinical Safety Disclaimer", ln=1)
    pdf.set_font("helvetica", "I", 9)
    disclaimer = (
        "This report is generated by the Cardio 3D AI system for educational and clinical "
        "decision-support purposes only. The risk percentages and 3D visual mappings represent "
        "statistical machine learning estimates based on the provided clinical inputs. This report "
        "DOES NOT constitute a formal medical diagnosis and is NOT a substitute for professional "
        "evaluation, laboratory testing, or formal coronary imaging (e.g., angiography). "
        "Always consult a qualified healthcare professional before making any clinical decisions."
    )
    pdf.multi_cell(0, 5, disclaimer)

    # Return as bytes
    return bytes(pdf.output())
