%lex
var expressSchemaBuilder = require("expressSchemaBuiler");

%%
\s+                 /* skip whitespace */
"(*"(.|\n|\r)*"*)"  /* ignore multiline comment */ ;
"--".*              /* ignore end of line comment */;
FUNCTION(.|\n|\r)*END_FUNCTION\; /* ignore functions */
ABSTRACT            return 'ABSTRACT';
ANDOR               return 'ANDOR';
AND                 return 'AND';
ARRAY               return 'ARRAY';
BAG                 return 'BAG';
OR                  return 'OR';
CONSTANT            return 'CONSTANT';
DERIVE              return 'DERIVE';
END_CONSTANT        return 'END_CONSTANT';
END_ENTITY          return 'END_ENTITY';
END_RULE            return 'END_RULE';
END_TYPE            return 'END_TYPE';
END_SCHEMA          return 'END_SCHEMA';
ENTITY              return 'ENTITY';
ENUMERATION         return 'ENUMERATION';
EXISTS              return 'EXISTS';
FOR                 return 'FOR';
INTEGER             return 'INTEGER';
INVERSE             return 'INVERSE';
IN                  return 'IN';
LIST                return 'LIST';
LOGICAL             return 'LOGICAL';
NUMBER              return 'NUMBER';
NOT                 return 'NOT';
NVL                 return 'NVL';
OF                  return 'OF';
ONEOF               return 'ONEOF';
OPTIONAL            return 'OPTIONAL';
QUERY               return 'QUERY';
REAL                return 'REAL';
RULE                return 'RULE';
SCHEMA              return 'SCHEMA';
SELECT              return 'SELECT';
SELF                return 'SELF';
SET                 return 'SET';
STRING              return 'STRING';
SIZEOF              return 'SIZEOF';
SUBTYPE             return 'SUBTYPE';
SUPERTYPE           return 'SUPERTYPE';
TYPEOF              return 'TYPEOF';
TYPE                return 'TYPE';
UNIQUE              return 'UNIQUE';
USEDIN              return 'USEDIN';
WHERE               return 'WHERE';
[a-zA-Z_][a-zA-Z0-9_]*    return 'identifier';
[0-9]+              return 'NUMBER';
':<>:'              return ':<>:';
'?'                 return '?';
':=:'               return ':=:';
':='                return ':=';
'='                 return '=';
';'                 return ';';
':'                 return ':';
')'                 return ')';
'('                 return '(';
'||'                return '||';
"'"                 return "'";
','                 return ',';
'<='                return '<=';
'>='                return '>=';
'<>'                return '<>';
'<*'                return '<*';
'<'                 return '<';
'>'                 return '>';
']'                 return ']';
'['                 return '[';
'.'                 return '.';
'|'                 return '|';
'*'                 return '*';
'-'                 return '-';
'+'                 return '+';
'\\'                return '\\';
<<EOF>>             return 'EOF';



/lex

%left '<=' '>=' '<' '>' '<*' '|'  '='   '*'  '\\'   ':<>:' ':=:' '||' '+' '-' '<>'
%left AND OR IN ANDOR
/* %left ')'*/
%left UNOT
%start expressions

%% /* language grammar */

_expressions : expression
             | _expressions  expression
             ;
expressions :
              _expressions EOF
            ;

bag_or_set  : BAG
            | SET
            ;
optional_inverse:| INVERSE identifier ':' bag_or_set range OF identifier FOR identifier ';'
        ;

abstract_el      : ABSTRACT SUPERTYPE
                     {
                       $$ = {
                           abstract: "ABSTRACT_SUPERTYPE",
                       };
                     }
                 | SUBTYPE OF '(' list_id ')'
                     {
                        list_id = $4;
                        $$ = {
                            abstract: "SUBTYPE_OF",
                            list_id: list_id
                        };
                     }

                 | SUBTYPE OF '('  ONEOF '('  list_id ')' ')'
                     {
                        list_id = $6;
                        $$ = {
                            abstract: "SUBTYPE_OF_ONEOF",
                            list_id: list_id
                        };
                     }

                 | SUPERTYPE OF '(' list_id ')'
                     {
                        list_id = $4;
                        $$ = {
                            abstract: "SUPERTYPE_OF",
                            list_id: list_id
                        };
                     }
                 | SUPERTYPE OF '(' ONEOF '(' list_id ')' ')'
                     {
                        list_id = $6;
                        $$ = {
                            abstract: "SUBTYPE_OF_ONEOF",
                            list_id: list_id
                        };
                     }
                 | SUPERTYPE OF '(' ONEOF '(' list_id ')' ANDOR identifier ')'
                     {
                        list_id = $6;
                        identifier = $9;
                        $$ = {
                            abstract: "SUBTYPE_OF_ONEOF_ANDOR",
                            list_id: list_id,
                            andor:   identifier
                        };
                     }
                 | SUPERTYPE OF '(' ONEOF '(' list_id ')' ANDOR ONEOF '('  list_id ')' ')'
                     {
                        list_id = $6;
                        identifier_list_id = $11;
                        $$ = {
                            abstract: "SUBTYPE_OF_ONEOF_ANDOR_ONEOF",
                            list_id: list_id,
                            andor:   identifier_list_id
                        };
                     }
                 ;

optional_derive  :| DERIVE list_der
                  ;

list_der          : list_der_item
                  | list_der_item list_der
                  ;

list_der_item     :  identifier ':' composite_type ':=' expr2   ';'
                  |  SELF '\\' identifier ':' composite_type ':=' expr2   ';'
                  |  SELF '\\' identifier '.' identifier ':' composite_type ':=' expr2   ';'
                  ;
optional_abstract : /* nothing */
                    {
                        $$ = null;
                    }
                  | abstract_el
                     {
                        $$ = $1;
                     }
                  | abstract_el abstract_el
                     {
                        $$ = [ $1 , $2 ];
                     }
                  | abstract_el abstract_el abstract_el
                     {
                        $$ = [ $1 , $2 , $3 ];
                     }
                  ;
expression:
        SCHEMA identifier ';'
        {

        }
        | END_SCHEMA';'

        | CONSTANT constants END_CONSTANT ';'

        | TYPE type END_TYPE ';'

        | ENTITY identifier optional_abstract ';'
            entity_description
            optional_inverse
            optional_unique
            optional_derive
            optional_where_rules
          END_ENTITY ';'
                {
                        var name =  $2;

                        var abstract = $3;

                        options = {}
                        options.properties = $5;
                        if (abstract != null) {
                            options.abstract = abstract;
                        }
                        yy.grammar.add_entity(name,options);
                }
        | ENTITY identifier optional_abstract';'
            optional_inverse
            optional_unique
            optional_derive
            optional_where_rules
          END_ENTITY ';'
                {
                        // console.log(" ENTITY-B" , $2);
                        var name =  $2 ;
                        var abstract = $3;
                        options = {}
                        options.properties = [];
                        if (abstract != null) {
                            options.abstract = abstract;
                        }
                        yy.grammar.add_entity(name,options);
                }
        | RULE identifier FOR '(' list_id ')' ';'
          optional_where_rules
          END_RULE ';'
        ;

optional_where_rules: |  WHERE rules;


optional_unique: |  UNIQUE identifier ':' list_id ';'
                 ;

optional_OPTIONAL :
                  | OPTIONAL
                  ;

composite_type : basic_type
                    {
                        $$ = $1;
                    }
               | identifier
                    {
                        $$ = $1;
                    }
               | LIST  range OF composite_type
                    {
                        composite_type = $4;
                        $$ = "LIST RANGE ..." + composite_type;
                    }
               | LIST  range OF UNIQUE composite_type
                    {
                        composite_type = $5;
                        $$ = "LIST RANGE OF UNIQUE ..." + composite_type;
                    }
               | SET   range OF composite_type
                    {
                        composite_type = $4;
                        $$ = "SET RANGE OF  ..." + composite_type;
                    }
               | ARRAY range OF composite_type
                    {
                        composite_type = $4;
                        $$ = "ARRAY RANGE OF  ..." + composite_type;
                    }
               ;


entity_prop : identifier ':' composite_type ';'
                  {

                    identifier     = $1;
                    composite_type = $3;
                    $$ = {
                        identifier: identifier,
                        composite_type: composite_type,
                        optional: false
                    }
                  }
            | identifier ':' OPTIONAL composite_type ';'
                  {
                        identifier     = $1;
                        composite_type = $4;

                        $$ = {
                            identifier: identifier,
                            composite_type: composite_type,
                            optional: true
                        }
                }
            ;


entity_description : entity_prop
                      {
                        $$ = [ $1 ];

                      }
                   | entity_prop  entity_description
                      {
                        $$ = $2;
                        $$.unshift($1);
                      }
                   ;
constants: constant
         | constant constants
         ;

stuff    :  identifier '(' string ')'
         |  identifier '(' ')'
         ;

expr     :  stuff
         |  expr '||' stuff
         ;

string   : "'" "'"
         ;

constant_b : identifier ':=' expr ';'
         ;

constant : identifier ":" constant_b
         ;

list_id  : identifier
            {
               $$ = [ $1 ];
            }
         | identifier ANDOR identifier
            {
              $$ = [ $1 , $2 ]
            }
         | identifier ',' list_id
           {
              $$ = $3
              $3.unshift($1);
           }
         ;

basic_type : REAL | INTEGER | NUMBER | STRING | LOGICAL ;


op               : '<=' | '>=' | AND  | OR | IN | '<*'
                 ;



function         : EXISTS | QUERY | SIZEOF | TYPEOF  | NVL  | USEDIN
                 ;

list_item        : "'" identifier '.' identifier "'"
                 | NUMBER
                 ;
list             : list_item
                 | list ',' list_item
                 ;
id2              : identifier
                 | identifier '.' id2
                 | SELF '.' id2
                 | SELF '\' id2
                 | SELF
                 | "'" identifier '.' identifier "'"
                 | "'" identifier '.' identifier '.' "'"
                 | "'" identifier '.' "'"
                 | "'" identifier "'"
                 | "'" "'"
                 ;
variable         : SELF
                 | identifier
                 | "'" identifier '.' identifier "'"
                 ;

list_arguments   :| expr2
                 | expr2 ',' list_arguments
                 ;
expr2            : expr2 '<=' expr2
                 | expr2 '>=' expr2
                 | expr2 '<' expr2
                 | expr2 '>' expr2
                 | expr2 AND expr2
                 | expr2 ANDOR expr2
                 | expr2 OR expr2
                 | expr2 IN expr2
                 | expr2 '<*' expr2
                 | expr2 '|' expr2
                 | expr2 '||' expr2
                 | expr2 '<>' expr2
                 | expr2 '*' expr2
                 | expr2 '+' expr2
                 | expr2 '-' expr2
                 | expr2 '=' expr2
                 | expr2 '\\' expr2
                 | expr2 ':<>:' expr2
                 | expr2 ':=:' expr2
                 | NUMBER
                 | NOT  expr2  %prec UNOT
                 | function   '(' list_arguments ')'
                 | function   '(' list_arguments ')' '.' id2
                 | identifier '(' list_arguments ')'
                 | identifier '(' list_arguments ')' '.' id2
                 | id2
                 | '[' list_arguments ']'
                 | id2 '[' expr2 ']'
                 | id2 '[' expr2 ']' '.' id2
                 | '(' expr2 ')'
                 ;

rule             :  identifier ':' expr2
                 ;

rules            :  rule  ';'
                 |  rule ';' rules
                 ;

range            : '[' NUMBER ':' '?' ']'

                    {
                    }

                 |  '[' NUMBER ':' NUMBER ']'
                 |  '[' NUMBER ':' identifier ']'

                 ;
type_declaration :   identifier "=" ENUMERATION OF '(' list_id ')' ';'
                     {
                         var name = $1;
                         var values = $6;
                         yy.grammar.add_enumeration(name,values);
                     }
                 |   identifier "=" LIST range OF  identifier  ';'
                 |   identifier "=" SET  range OF  identifier  ';'
                 |   identifier "=" SELECT '(' list_id ')' ';'
                 |   identifier "=" basic_type ';'
                 |   identifier "=" identifier ';'
                 ;
type : type_declaration
     | type_declaration WHERE rules
     ;
