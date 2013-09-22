%lex

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



/lex

%left '<=' '>=' '<' '>' '<*' '|'  '='   '*'  '\\'   ':<>:' ':=:' '||' '+' '-' '<>'
%left AND OR IN ANDOR
/* %left ')'*/
%left UNOT
%start expressions

%% /* language grammar */

expressions : expression
            | expression expressions
            ;

bag_or_set  : BAG
            | SET
            ;
optional_inverse:| INVERSE identifier ':' bag_or_set range OF identifier FOR identifier ';'
        ;
optional_abstract_el:
                   ABSTRACT SUPERTYPE
                 | SUBTYPE OF '(' list_id ')'
                 | SUBTYPE OF '('  ONEOF '('  list_id ')' ')'
                 | SUPERTYPE OF '(' list_id ')'
                 | SUPERTYPE OF '(' ONEOF '(' list_id ')' ')'
                 | SUPERTYPE OF '(' ONEOF '(' list_id ')' ANDOR identifier ')'
                 | SUPERTYPE OF '(' ONEOF '(' list_id ')' ANDOR ONEOF '('  list_id ')' ')'
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
optional_abstract :
                  | optional_abstract_el
                  | optional_abstract_el optional_abstract_el
                  | optional_abstract_el optional_abstract_el optional_abstract_el
                  ;
expression:
        SCHEMA identifier ';'
        {
           // console.log(" identifier ",$2);
           yy.grammar = {};

        }
        | END_SCHEMA';'

        | CONSTANT constants END_CONSTANT ';'

        | TYPE type END_TYPE ';'

        | ENTITY identifier optional_abstract';'
            entity_description
            optional_inverse
            optional_unique
            optional_derive
            optional_where_rules
          END_ENTITY ';'
        | ENTITY identifier optional_abstract';'
            optional_inverse
            optional_unique
            optional_derive
            optional_where_rules
          END_ENTITY ';'
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
               | identifier
               | LIST  range OF composite_type
               | LIST  range OF UNIQUE composite_type
               | SET   range OF composite_type
               | ARRAY range OF composite_type
               ;
entity_prop : identifier ':' composite_type ';'
            | identifier ':' OPTIONAL composite_type ';'
            ;
entity_description : entity_prop
                   | entity_prop  entity_description
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
               // console.log(" A =",$$);
            }
         | identifier ANDOR identifier
            {
              $$ = [ $1 , $2 ]
            }
         | identifier ',' list_id
           {
              //console.log(" B =",$1,$3);
              // $$ = $3
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
                       // console.log("range !!!",$2);
                    }

                 |  '[' NUMBER ':' NUMBER ']'
                 |  '[' NUMBER ':' identifier ']'

                 ;
type_declaration :   identifier "=" ENUMERATION OF '(' list_id ')' ';'
                     {
                         // console.log(" ",$1,"ENUMERATION OF ", $6);
                         var name = $1;
                         var list = $6;
                         yy.grammar[name] = {
                            type: "enumeration",
                            enum: $6
                         };
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
