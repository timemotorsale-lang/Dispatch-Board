import json,hashlib
from pathlib import Path
import pdfplumber
root=Path('docs/sales-signing-package/final/forms')
common={
 'Buyer legal name':'buyer','Buyer':'buyer','Co buyer legal name':'coBuyer','Co-buyer legal name':'coBuyer','Co buyer':'coBuyer','Buyer / co-buyer':'buyers',
 'Agreement number':'dealNumber','Agreement / stock number':'agreementStock','VIN':'vin','Year / make / model':'vehicle','Vehicle year make model':'vehicle','Year make model body style':'vehicle',
 'Dealer legal name':'dealerName','Seller legal name':'dealerName','Dealer license':'dealerLicense','Seller address':'dealerAddress','Telephone':'dealerPhone',
 'Buyer address':'buyerAddress','Principal / owner address':'buyerAddress','Co buyer address':'coBuyerAddress','Color':'color','Sale date':'saleDate','Date':'saleDate','Stock number':'stockNumber','Mileage displayed':'mileage',
 'Buyer signature / date':'buyer_signature','Co buyer signature / date':'co_buyer_signature','Co-buyer signature / date':'co_buyer_signature','Authorized dealer representative signature / date':'dealer_signature','Authorized dealer representative / date':'dealer_signature',
 'Principal / owner signature and date':'buyer_signature','Additional owner signature and date':'co_buyer_signature','Buyer acknowledgment / date':'buyer_signature','Dealer representative / date':'dealer_signature'
}
special={
 'sales-agreement':('01-motor-vehicle-purchase-agreement.pdf',{'Plate and state':'plate','Trade year make model body style':'tradeVehicle','Trade VIN':'tradeVin','Trade owner and lienholder':'tradeLienholder','Vehicle selling price':'sale','Selected products / accessories total':'accessories','Document administration fee':'docFee','Sales tax':'tax','Title fee':'titleFee','Registration / plate fee':'registrationFee','Other agreed charge (identify)':'otherFee','Total cash purchase price':'purchaseTotal','Less trade allowance':'trade','Plus trade lien payoff':'payoff','Less deposits / cash already paid':'paid','Remaining balance due / to finance':'balance','Payment method: cash / outside loan / dealer credit':'paymentMethod','Delivery date and location':'deliveryPlace','Financing condition: yes / no':'noFinance','Other fees / charges identified above':'otherFeeLabel'}),
 'title-damage-disclosure':('02-title-and-damage-disclosure.pdf',{'Presentation date':'saleDate','Exact brand, issuing state and supporting record':'titleBrand','Other known material history disclosed':'damageDisclosure'}),
 'we-owe':('03-promised-work-we-owe.pdf',{'Appointment or completion deadline':'promiseDue'}),
 'delivery-documents':('04-vehicle-delivery-receipt.pdf',{'Delivery date and time':'deliveryDate','Mileage at delivery':'mileage','Keys and remotes quantity':'keys','Visible condition and exceptions noted at handover':'deliveryNotes','Outstanding documents or work, responsible person and due date':'promises','Insurance carrier and policy reference':'insurance'}),
 'arbitration-agreement':('05-separate-arbitration-agreement.pdf',{}),
 'power-of-attorney':('06-limited-power-of-attorney.pdf',{'Agent legal name':'authorizedAgent','Agent business address':'dealerAddress','Effective date':'saleDate','Expiration date (required)':'poaExpiration','Notary public signature / seal':'notary_signature','Commission expires':'notary_commission'}),
 'as-is-acknowledgment':('07-conditional-as-is-acknowledgment.pdf',{'Exact statutory exclusion and subdivision':'asIsExclusion','Facts establishing exclusion':'warrantyExemption','Reviewed by / date':'eligibilityReviewedBy','Known conditions and defects separately disclosed':'damageDisclosure'}),
 'warranty-disclosure':('10-limited-used-vehicle-warranty.pdf',{'Warrantor legal name / physical address':'warrantor','Warranty service contact / telephone':'warrantyContact','Delivery mileage':'mileage','Additional covered components / broader coverage':'warrantyCoverage','Additional components / coverage terms (or None)':'warrantyCoverage','Dealer reviewer / date':'eligibilityReviewedBy'})
}
result={}
for id,(filename,extra) in special.items():
 pdf=pdfplumber.open(root/filename); mapped=[];used=set(); counts={}
 for pi,page in enumerate(pdf.pages):
  for label,key in sorted({**common,**extra}.items(),key=lambda item:-len(item[0])):
   for hit in page.search(label,regex=False):
    if hit['top']<125 or hit['top']>740:continue
    nearby=[c for c in page.chars if abs(c['top']-hit['top'])<1]
    if any(0<c['x0']-hit['x1']<4 and c['text'].strip() for c in nearby):continue
    if any(0<hit['x0']-c['x1']<4 and c['text'].strip() for c in nearby):continue
    signature=key.endswith('_signature') or key=='notary_commission'
    if signature:
     lines=[l for l in page.lines if abs(l['top']-l['bottom'])<.1 and -1< hit['top']-l['top'] < 10 and abs(l['x0']-hit['x0'])<3]
     if not lines:lines=[l for l in page.lines if abs(l['top']-l['bottom'])<.1 and 1<l['top']-hit['bottom']<40 and abs(l['x0']-hit['x0'])<3]
    elif id=='sales-agreement' and key in ['sale','accessories','docFee','tax','titleFee','registrationFee','otherFee','purchaseTotal','trade','payoff','paid','balance']:
     lines=[l for l in page.lines if abs(l['top']-l['bottom'])<.1 and abs(l['top']-hit['bottom'])<5 and 250<l['x0']<290]
    else:
     lines=[l for l in page.lines if abs(l['top']-l['bottom'])<.1 and 1<l['top']-hit['bottom']<40 and abs(l['x0']-hit['x0'])<3]
    if not lines:continue
    line=min(lines,key=lambda l:abs(l['top']-hit['bottom']))
    place=(pi,round(line['x0'],1),round(line['top'],1))
    if place in used:continue
    used.add(place);counts[key]=counts.get(key,0)+1
    mapped.append({'key':key,'name':key if counts[key]==1 else key+'_'+str(counts[key]),'page':pi,'x':round(line['x0']+1,2),'y':round(page.height-line['top']+1,2),'width':round(line['x1']-line['x0']-2,2),'height':11 if signature else 10 if id=='sales-agreement' and key in ['sale','accessories','docFee','tax','titleFee','registrationFee','otherFee','purchaseTotal','trade','payoff','paid','balance'] else min(14,max(6,line['top']-hit['bottom']-1)),'signature':signature,'label':label})
 # Signature anchors in the companion forms may sit above or below their blank lines.
 for pi,page in enumerate(pdf.pages):
  for label,key in common.items():
   if not key.endswith('_signature'):continue
   for hit in page.search(label,regex=False):
    if hit['top']<130:continue
    candidates=[l for l in page.lines if abs(l['top']-l['bottom'])<.1 and abs(l['x0']-hit['x0'])<3 and (-1<hit['top']-l['top']<10 or 1<l['top']-hit['bottom']<40)]
    if not candidates:continue
    line=min(candidates,key=lambda l:abs(l['top']-hit['bottom']))
    if any(f['page']==pi and abs(f['x']-line['x0']-1)<1 and abs(f['y']-(page.height-line['top']+1))<1 and f['signature'] for f in mapped):continue
    mapped=[f for f in mapped if not (f['page']==pi and abs(f['x']-line['x0']-1)<1 and abs(f['y']-(page.height-line['top']+1))<1)]
    name=key if not any(f['name']==key for f in mapped) else key+'_'+str(pi+1)
    mapped.append({'key':key,'name':name,'page':pi,'x':round(line['x0']+1,2),'y':round(page.height-line['top']+1,2),'width':round(line['x1']-line['x0']-2,2),'height':11,'signature':True,'label':label})
 if id=='we-owe':
  mapped.append({'key':'promises','name':'promised_work','page':0,'x':71,'y':447,'width':260,'height':26,'signature':False,'label':'Work or item promised'})
  mapped.append({'key':'promiseDue','name':'promised_work_due','page':0,'x':469,'y':447,'width':74,'height':20,'signature':False,'label':'Promised work due'})
 if id=='warranty-disclosure':
  for key,x,y,w in [('term_60',115.15,465.2,10.4),('term_30',233.94,465.2,10.4),('term_15',42,453.2,10.4),('warrantyStartDate',206.4,478.5,47.5),('warrantyStartMileage',309.4,478.5,47.5)]:
   mapped.append({'key':key,'name':key,'page':0,'x':x,'y':y,'width':w,'height':9,'signature':False,'label':key})
 names={}
 for field in mapped:
  key=field['key'];names[key]=names.get(key,0)+1;field['name']=key if names[key]==1 else key+'_'+str(names[key])
 result[id]={'file':filename,'sha256':hashlib.sha256((root/filename).read_bytes()).hexdigest(),'pages':len(pdf.pages),'fields':mapped}
 print(id,len(mapped),'fields',len(pdf.pages),'pages')
Path('src/server/services/cash-signing-template-map.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
