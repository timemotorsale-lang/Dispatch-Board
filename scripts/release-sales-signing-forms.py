from pathlib import Path
import hashlib,json,re
from pypdf import PdfReader,PdfWriter
from pypdf.generic import ContentStream,NameObject,TextStringObject,ArrayObject
ROOT=Path('docs/sales-signing-package');SOURCE=ROOT/'review/forms';DEST=ROOT/'final/forms';DEST.mkdir(parents=True,exist_ok=True)
replacements={
 'DRAFT FOR LEGAL REVIEW - NOT APPROVED FOR LIVE SIGNING':'',
 'REVIEW DRAFT - NOT APPROVED FOR CUSTOMER SIGNING':'',
 'Printed review template - complete all applicable fields':'Complete all applicable fields before signing.',
 'Address / dealer license / email / website: pending confirmation':'',
 'TMS-MN-REVIEW-0.2':'TMS-MN-SIGNING-1.0',
 'Original Time Motor Sales draft':'Time Motor Sales agreement',
 'Proposed policy for legal review':'Separate buyer election',
 'complete legal review before using this disclaimer':'confirm eligibility before using this disclaimer',
 'the proposed policy is:':'the policy is:',
 'under this proposed contract':'under this contract',
 'Proposed accrual method:':'Accrual method:',
 'authorized by this draft':'authorized by this contract',
 'This draft does not':'This warranty does not',
 'This draft':'This warranty',
 'Any proposed part-specific waiver':'Any part-specific waiver',
 'Proposed installment contract reference':'Installment contract reference',
 'using the proposed credit terms':'using the agreed credit terms'
}
def change(text):
 if text in ['YOUR','LOGO']:return ''
 for before,after in replacements.items():text=text.replace(before,after)
 return text
manifest={'version':'TMS-MN-SIGNING-1.0','header':'TMS-HDR-02','released_on':'2026-11-03','release_authority':'Owner instruction in this conversation to present these as final customer signing forms','forms':[]}
for src in sorted(SOURCE.glob('*.pdf')):
 if src.name.startswith('13-'):continue
 writer=PdfWriter();reader=PdfReader(src);writer.clone_document_from_reader(reader)
 if not src.name.startswith('12-'):
  for page in writer.pages:
   stream=ContentStream(page.get_contents(),writer)
   for operands,operator in stream.operations:
    if operator==b'Tj' and isinstance(operands[0],TextStringObject):
     old=str(operands[0]);new=change(old)
     if new!=old:operands[0]=TextStringObject(new)
    elif operator==b'TJ':
     array=operands[0]
     for index,item in enumerate(array):
      if isinstance(item,TextStringObject):
       new=change(str(item))
       if new!=str(item):array[index]=TextStringObject(new)
   page[NameObject('/Contents')]=writer._add_object(stream)
  writer.add_metadata({'/Title':src.stem[3:].replace('-',' ').title(),'/Author':'Time Motor Sales','/Subject':'Customer signing form - TMS-MN-SIGNING-1.0','/Keywords':'Time Motor Sales, customer signing, TMS-HDR-02'})
 target=DEST/src.name
 if src.name.startswith('12-'):target.write_bytes(src.read_bytes())
 else:
  with target.open('wb') as out:writer.write(out)
 text='\n'.join(p.extract_text() for p in PdfReader(target).pages)
 assert not re.search(r'legal review|REVIEW DRAFT|DRAFT FOR|NOT APPROVED|Printed review template|MN-REVIEW',text,re.I),(src.name,'release wording remains')
 manifest['forms'].append({'file':src.name,'pages':len(reader.pages),'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'official_unchanged':src.name.startswith('12-')})
merged=PdfWriter()
for entry in manifest['forms']:merged.append(DEST/entry['file'])
with (ROOT/'final/TMS_Sales_Signing_Forms_Final.pdf').open('wb') as out:merged.write(out)
(ROOT/'final/release-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('Released',len(manifest['forms']),'forms;',len(merged.pages),'pages. Historical review copies preserved.')
