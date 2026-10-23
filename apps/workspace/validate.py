
import xmlschema
import sys
try:
    schema = xmlschema.XMLSchema('http://www.imsglobal.org/xsd/imsqti_v2p1.xsd')
    schema.validate('val0001.xml')
    print("XSD VALIDATION SUCCESSFUL")
    sys.exit(0)
except Exception as e:
    print(f"XSD VALIDATION FAILED: {e}")
    sys.exit(1)
      