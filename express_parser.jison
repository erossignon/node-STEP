%lex
var expressSchemaBuilder = require("expressSchemaBuiler");

%%
\s+                 /* skip whitespace */
"'"([^\']*)"'"                return 'QUOTED_STRING';
"(*"([^\*]|\n|\r)*"*)"  /* ignore multiline comment */ console.log(" Comment - ",yytext);
"--".*              /* ignore end of line comment */;
ABSTRACT            return 'ABSTRACT';
ANDOR               return 'ANDOR';
AND                 return 'AND';
ARRAY               return 'ARRAY';
BAG                 return 'BAG';
BEGIN               return 'BEGIN';
BY                  return 'BY';
CASE                return 'CASE';
CONSTANT            return 'CONSTANT';
DERIVE              return 'DERIVE';
ELSE                return 'ELSE';
END_CASE            return 'END_CASE';
END_CONSTANT        return 'END_CONSTANT';
END_ENTITY          return 'END_ENTITY';
END_FUNCTION        return 'END_FUNCTION';
END_IF              return 'END_IF';    
END_LOCAL           return 'END_LOCAL';
END_RULE            return 'END_RULE';
END_REPEAT          return 'END_REPEAT';
END_TYPE            return 'END_TYPE';
END_SCHEMA          return 'END_SCHEMA';
END                 return 'END';
ENTITY              return 'ENTITY';    
ENUMERATION         return 'ENUMERATION';
ESCAPE              return 'ESCAPE';
EXISTS              return 'EXISTS';
FIXED               return 'FIXED';
FOR                 return 'FOR';
FUNCTION            return 'FUNCTION';
GENERIC             return 'GENERIC';
IF                  return 'IF';
INTEGER             return 'INTEGER';
INVERSE             return 'INVERSE';
IN                  return 'IN';
LIST                return 'LIST';
LIKE                return 'LIKE';
LOCAL               return 'LOCAL';
LOGICAL             return 'LOGICAL';
MOD                 return 'MOD';
NUMBER              return 'NUMBER';
NOT                 return 'NOT';
NVL                 return 'NVL';
OF                  return 'OF';
ONEOF               return 'ONEOF';
OPTIONAL            return 'OPTIONAL';
OR                  return 'OR';
OTHERWISE           return 'OTHERWISE';
QUERY               return 'QUERY';
REAL                return 'REAL';
REPEAT              return 'REPEAT';
RETURN              return 'RETURN';
RULE                return 'RULE';
SCHEMA              return 'SCHEMA';
SELECT              return 'SELECT';
SELF                return 'SELF';
SET                 return 'SET';
STRING              return 'STRING';
SIZEOF              return 'SIZEOF';
SUBTYPE             return 'SUBTYPE';
SUPERTYPE           return 'SUPERTYPE';
THEN                return 'THEN';
TYPEOF              return 'TYPEOF';
TO                  return 'TO';
TYPE                return 'TYPE';
UNIQUE              return 'UNIQUE';
USEDIN              return 'USEDIN';
WHERE               return 'WHERE';
XOR                 return 'XOR';

[a-zA-Z_][a-zA-Z0-9_]*    return 'identifier';
(\-)?[0-9]+"."[0-9]*(E(\-)?[0-9]+)?              return 'FLOAT';
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
'/'                 return '/';
'-'                 return '-';
'+'                 return '+';
'\\'                return '\\';
'{'                 return '{';
'}'                 return '}';
<<EOF>>             return 'EOF';



/lex

%left '<=' '>=' '<' '>' '<*' '|'  '='   '*' '/'  '\\'   ':<>:' ':=:' '||' '+' '-' '<>'
%left AND OR IN ANDOR XOR MOD LIKE
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

inverse         : identifier ':' bag_or_set range OF identifier FOR identifier ';'
                | identifier ':' identifier FOR identifier ';'
                ;
inverse_list    :  inverse  |inverse inverse_list
                ;
optional_inverse:|  INVERSE inverse_list
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
                 | ABSTRACT SUPERTYPE OF '(' ONEOF '(' list_id ')' ')'
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

optional_sections  :| DERIVE list_der        optional_sections
                    | UNIQUE unique_list     optional_sections
                    | INVERSE inverse_list   optional_sections
                    ;               

list_der          : list_der_item
                  | list_der_item list_der
                  ;

list_der_item     :  identifier ':' composite_type ':=' expr2   ';'
                  |  SELF '\\' identifier ':' composite_type ':=' expr2   ';'
                  |  SELF '\\' identifier '.' identifier ':' composite_type ':=' expr2   ';'
                  |  LIST range OF identifier ':=' expr2 ';'
                  ;
optional_abstract : /* nothing */
                    {
                        $$ = null;
                    }
                  | abstract_el
                     {
                        $$ = [ $1 ];
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
            optional_sections
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
            optional_sections
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
          optional_function_local_declarations
          function_statements
          optional_where_rules
          END_RULE ';'
        
        | FUNCTION identifier '(' function_args_declaration ')' ':' function_argument_type ';'
           optional_function_local_declarations
           function_statements
           END_FUNCTION ';'  
        ;



local_declaration  : list_identifiers ':' function_argument_type ':=' expr2 ';'
                   | list_identifiers ':' function_argument_type ';'
                   ;

local_declarations :| local_declaration local_declarations
                   ;


function_local_declarations : LOCAL local_declarations END_LOCAL ';'
                            ;

optional_function_local_declarations :| function_local_declarations
                                     ;
function_argument_type: composite_type
                      ;

list_identifiers:    identifier 
                |    identifier ',' list_identifiers 
                ;

function_args:   list_identifiers ':'function_argument_type   
             ;

function_args_declaration:| function_args 
                          | function_args ';' function_args_declaration 
                           ;

function_statements :| function_statement function_statements ;

repeat_opt_by :| BY expr2 ;

cases         :   expr2 ':' function_statement
              ;

list_cases    : cases 
              | cases list_cases 
              ;

function_statement: 
       IF expr2 THEN function_statements END_IF  ';'
     | IF expr2 THEN function_statements ELSE function_statements END_IF  ';'
     | id2 ':=' expr2 ';'
     | REPEAT identifier ':=' expr2 TO expr2  ';' function_statements END_REPEAT ';'
     | REPEAT identifier ':=' expr2 TO expr2 BY expr2 ';' function_statements END_REPEAT ';'
     | RETURN expr2 ';'
     | CASE id3 OF list_cases OTHERWISE ':' function_statement END_CASE';'
     | CASE id3 OF list_cases END_CASE';'
     | ESCAPE ';'
     | BEGIN function_statements END ';'
 ;

optional_where_rules: |  WHERE rules;


unique           : identifier ':' list_id ';'
                 ;

unique_list      : unique
                 | unique unique_list
                 ;

optional_unique: |  UNIQUE unique_list 
                 ;

optional_OPTIONAL :
                  | OPTIONAL
                  ;

composite_type   : basic_type
                    {
                        $$ = $1;
                    }

                 | identifier
                    {
                        $$ = $1;
                    }

                 | GENERIC ':' composite_type 
                    {
                        composite_type = $3;
                        $$ = {
                           type: "GENERIC",
                           composite_type: composite_type
                        };
                    }

                 | ARRAY OF composite_type
                   {
                        composite_type = $3;
                        $$ = {
                           type: "GENERIC",
                           composite_type: composite_type
                        };
                    } 

                 | ARRAY range OF composite_type
                   {
                        composite_type = $4;
                        $$ = {
                           type: "GENERIC",
                           composite_type: composite_type
                        };
                    } 



                | BAG  OF composite_type
                    {
                        composite_type = $3;
                        $$ = {
                           type: "BAG_OF",
                           composite_type: composite_type
                        };
                    }

               | LIST  range OF composite_type
                    {
                        composite_type = $4;
                        $$ = {
                           type: "LIST_RANGE_OF",
                           composite_type: composite_type
                        };
                    }
                | LIST  OF composite_type
                    {
                        composite_type = $3;
                        $$ = {
                           type: "LIST_OF",
                           composite_type: composite_type
                        };
                    }
               | LIST  range OF UNIQUE composite_type
                    {
                        composite_type = $5;
                        $$ = {
                           type: "LIST_RANGE_OF_UNIQUE",
                           composite_type: composite_type
                        };
                    }
               | SET  range OF composite_type
                    {
                        composite_type = $4;
                        $$ = {
                           type: "SET_OF",
                           composite_type: composite_type
                        };
                    }
                | SET   OF composite_type
                    {
                        composite_type = $3;
                        $$ = {
                           type: "SET_OF",
                           composite_type: composite_type
                        };
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


args     : 
         | expr 
         | args ',' expr
         ;

stuff    : string 
         | identifier
         | NUMBER
         ;

expr     :  stuff
{
    console.log("suff=",$1);
}
         |  identifier '(' args ')'
         |  identifier '[' args ']'
         |  expr '||' expr
         |  expr '+' expr 
         |  expr '-' expr
         |  expr '*' expr
         |  expr '/' expr
         |  '(' expr ')' 
         |  '[' expr ':' expr ']'
         |  '[' expr ']'
         ;

string   : QUOTED_STRING
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



basic_type : REAL 
           | INTEGER 
           | NUMBER 
           | STRING 
           | STRING '(' NUMBER ')' FIXED 
           | STRING '(' NUMBER ')' 
           | LOGICAL  
           ;

basic_type2 : basic_type 
            | identifier
            ;

op          : '<=' | '>=' | AND  | OR | XOR | IN | '<*'
            ;



function         : EXISTS | QUERY | SIZEOF | TYPEOF  | NVL  | USEDIN 
                 ;

list_item        : "'" identifier '.' identifier "'"
                 | NUMBER
                 ;
list             : list_item
                 | list ',' list_item
                 ;

id3              : identifier
                 | id3  '[' expr2 ']'
                 | id3  '.' identifier
                 ;

id2              : id3
                 | id3 '\' id3
                 | SELF '.' id3
                 | SELF '\' id3
                 | SELF
                 | "'" identifier '.' identifier "'"
                 | "'" identifier '.' identifier '.' "'"
                 | "'" identifier '.' "'"
                 | "'" identifier "'"
                 | "'" "'"
                 | SELF '[' expr2 ']'
                 ;

variable         : SELF
                 | identifier
                 | "'" identifier '.' identifier "'"
                 ;

list_arguments   :| expr2
                  | expr2 ',' list_arguments
                  ;


less_op          : '<' | '<=' 
                 ; 

expr2            : expr2 '<=' expr2
                 | expr2 '>=' expr2
                 | expr2 '<' expr2
                 | expr2 '>' expr2
                 | '{' NUMBER  '<'  expr2 '<=' NUMBER '}'
                 | '{' NUMBER  '<=' expr2 '<=' NUMBER '}'
                 | '{' FLOAT   '<'  expr2 '<=' FLOAT '}'
                 | '{' FLOAT   '<=' expr2 '<=' FLOAT '}'
                 | expr2 AND expr2
                 | expr2 ANDOR expr2
                 | expr2 OR expr2
                 | expr2 XOR expr2
                 | expr2 MOD expr2
                 | expr2 IN expr2
                 | expr2 LIKE expr2
                 | expr2 '<*' expr2
                 | expr2 '|' expr2
                 | expr2 '||' expr2
                 | expr2 '<>' expr2
                 | expr2 '*' expr2
                 | expr2 '/' expr2
                 | expr2 '+' expr2
                 | expr2 '-' expr2
                 | expr2 '=' expr2
                 | expr2 '\\' expr2
                 | expr2 ':<>:' expr2
                 | expr2 ':=:' expr2
                 | NUMBER
                 | FLOAT
                 | string
                 | '?'                 
                 | function   '(' list_arguments ')'
                 | function   '(' list_arguments ')' '.' id2
                 | identifier '(' list_arguments ')'
                 | identifier '(' list_arguments ')' '.' id2
                 | id2
                 | '[' list_arguments ']'
                  | '[' expr2 ':' expr2 ']'
                 | '(' expr2 ')'
                 | NOT  expr2  %prec UNOT
                 | '-'  expr2  %prec UNOT
                 ;

rule             : identifier ':' expr2 ';'
                 | identifier ':' ';'
                 ;

rules            :  rule 
                 |  rule rules
                 ;

range            : '[' NUMBER ':' '?' ']'

                    {
                    }

                 |  '[' NUMBER ':' NUMBER ']'
                 |  '[' NUMBER ':' identifier ']'
                 |  '[' identifier ':' identifier ']'
                 ;


type_declaration :   identifier "=" ENUMERATION OF '(' list_id ')' ';'
                     {
                         var name = $1;
                         var values = $6;
                         yy.grammar.add_enumeration(name,values);
                     }
                 |   identifier "=" ARRAY range OF  basic_type2  ';'
                 |   identifier "=" MLIST range OF  basic_type2  ';'
                 |   identifier "=" LIST  range OF  basic_type2  ';'
                 |   identifier "=" SET   range OF  basic_type2  ';'
                 |   identifier "=" SELECT '(' list_id ')' ';'
                     {
                        var name = $1;
                        var values = $5;
                        yy.grammar.add_select(name,values);
                     }
                 |   identifier "=" basic_type ';'
                     {
                         var name = $1;
                         var type = $3;
                         yy.grammar.add_type(name,type);
                     }
                 |   identifier "=" identifier ';'
                     {
                         var name = $1;
                         var type = $3;
                         yy.grammar.add_type(name,type);

                     }
                 ;
type : type_declaration
     | type_declaration WHERE rules
     ;
