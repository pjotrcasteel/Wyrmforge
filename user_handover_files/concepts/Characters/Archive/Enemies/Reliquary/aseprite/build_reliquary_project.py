from pathlib import Path
base=Path('build_hound_project.py').read_text()
items=[('Normal_Colour','c0db7540-4844-450a-8d22-489cc548d4fc',True),('Normal_Height_DRAFT','329664c9-bbf1-44e0-8fda-a7c2813ccf6d',False),('Normal_Emissive_DRAFT','b973fff8-0a77-4c9f-b4ac-e7e3545ed924',False),('Awakened_Colour','151dbcb8-cbe3-4c84-b8ed-c6961f0ae23f',False),('Awakened_Height_DRAFT','f25442bf-0ec9-4adb-a0b2-8b7c88b4a6d4',False),('Awakened_Emissive_DRAFT','4f49e407-7892-41f1-9abb-5605f4218a2d',False),('Ward_Normal_UNSLICED','3e4bc206-ff9e-4178-9371-333e88c46054',False),('Corruption_Normal_UNSLICED','f4681c5e-e1fc-44b3-a9aa-8544fccb45f6',False),('Seal_Normal_Light_Study_UNSLICED','90262c89-5039-4bc6-8f52-a2516f75c626',False),('Ward_Awakened_UNSLICED','b23272a7-6d57-414a-b9ef-6e9ed7d67ec6',False),('Corruption_Awakened_UNSLICED','c66536ca-b386-4acb-92a1-c465e6a045d1',False),('Seal_Awakened_UNSLICED','fe462086-d470-4ec5-bf38-5440da670c86',False),('Transformation_Exposed_Core_DRAFT','c671a5a4-8266-49bc-a571-dd2b6bec5f0f',False),('SUPERSEDED_Subtle_Shift','a708f202-9624-4638-8a11-4818d144b17c',False)]
a=base.index('items=');b=base.index('\nchunks=',a)
base=base[:a]+'items='+repr(items)+base[b:]
base=base.replace('Mire-Hound-Aseprite','Reliquary-Aseprite').replace('Mire-Hound-source-study.aseprite','Reliquary-both-forms-source-study.aseprite').replace('if i in (1,2):','if name.endswith("_DRAFT") and ("Height" in name or "Emissive" in name):')
exec(compile(base,__file__,'exec'))
print('Validated 14 layers, one timeline frame, four material drafts.')
