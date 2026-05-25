# apps/interviews/management/commands/seed_interviews.py
"""
Seed interview database with AI-evaluation-ready rubrics.
Run: python manage.py seed_interviews
"""
from django.core.management.base import BaseCommand
from apps.interviews.models import InterviewDomain, InterviewType, Competency, Question, RoadmapTemplate


class Command(BaseCommand):
    help = 'Seed interview domains, competencies, questions, and roadmap templates'

    def handle(self, *args, **options):
        self.stdout.write('Seeding interview data...')
        self._seed_domains()
        self.stdout.write(self.style.SUCCESS('Done! Interview data seeded.'))

    def _seed_domains(self):
        self._seed_domain(
            name='Digital Marketing', icon='📱',
            description='Marketing strategy and digital channels',
            type_code='dm_strategy', type_name='Marketing Strategy',
            duration=30, questions_per_session=3,
            comp_fn=self._dm_comps,
            roadmaps=[('Digital Marketing Fast Track', '4_weeks', 20),
                      ('Digital Marketing Comprehensive', '8_weeks', 40)]
        )
        self._seed_domain(
            name='Computer Science', icon='💻',
            description='Programming, DSA, and system design',
            type_code='cs_fundamentals', type_name='CS Fundamentals',
            duration=30, questions_per_session=3,
            comp_fn=self._cs_comps,
            roadmaps=[('CS Bootcamp', '4_weeks', 25), ('CS Interview Prep', '8_weeks', 50)]
        )
        self._seed_domain(
            name='Business Analytics', icon='📊',
            description='Data analysis and business intelligence',
            type_code='ba_analysis', type_name='Data Analysis',
            duration=30, questions_per_session=3,
            comp_fn=self._ba_comps,
            roadmaps=[('Analytics Essentials', '4_weeks', 20), ('Analytics Deep Dive', '8_weeks', 45)]
        )
        self._seed_domain(
            name='Communication & Soft Skills', icon='🗣️',
            description='Verbal, written, and interpersonal skills',
            type_code='comm_skills', type_name='Communication Assessment',
            duration=25, questions_per_session=3,
            comp_fn=self._comm_comps,
            roadmaps=[]
        )

    def _seed_domain(self, name, icon, description, type_code, type_name,
                     duration, questions_per_session, comp_fn, roadmaps):
        domain, _ = InterviewDomain.objects.get_or_create(
            name=name, defaults={'description': description, 'icon': icon}
        )
        itype, _ = InterviewType.objects.get_or_create(
            code=type_code,
            defaults={
                'domain': domain, 'name': type_name,
                'duration_minutes': duration,
                'questions_per_session': questions_per_session,
            }
        )
        comp_fn(itype)
        for rname, rduration, rhours in roadmaps:
            self._seed_roadmap(domain, rname, rduration, rhours)

    # ── Competency builders ──────────────────────────────────────

    def _dm_comps(self, itype):
        self._create_comp(itype, {
            'name': 'Product Strategy',
            'description': 'Ability to develop and articulate product strategy',
            'weight': 1.5,
            'mastery_keywords': ['value proposition', 'target market', 'competitive positioning', 'product roadmap'],
            'questions': [
                {
                    'text': 'How would you develop a go-to-market strategy for a new product?',
                    'difficulty': 'advanced',
                    'ideal_answer': (
                        'A strong answer covers: (1) Market research and target audience identification, '
                        '(2) Value proposition and positioning, (3) Channel selection (paid, organic, partnerships), '
                        '(4) Launch timeline, (5) KPIs and success metrics like CAC, MRR, and conversion rates.'
                    ),
                    'rubric': {
                        'technical_accuracy': {
                            'weight': 60,
                            'criteria': [
                                'Correctly identifies target market and segmentation',
                                'Mentions competitive analysis or positioning',
                                'Includes channel strategy (digital/offline)',
                            ]
                        },
                        'depth': {
                            'weight': 40,
                            'criteria': [
                                'Provides a real-world or hypothetical product example',
                                'Discusses success metrics or KPIs',
                            ]
                        },
                    },
                    'difficulty_metadata': {
                        'expected_duration_seconds': 180,
                        'follow_up_if_strong': 'How would you measure the ROI of this launch after 90 days?',
                        'follow_up_if_weak': 'Can you explain what a value proposition is in simple terms?',
                    },
                },
                {
                    'text': 'Describe your approach to product positioning in a competitive market.',
                    'difficulty': 'intermediate',
                    'ideal_answer': (
                        'Covers competitor analysis, identifying unique differentiators, '
                        'crafting a clear positioning statement, and targeting the right audience segment.'
                    ),
                    'rubric': {
                        'technical_accuracy': {
                            'weight': 60,
                            'criteria': ['Mentions differentiation', 'References competitor analysis', 'Positioning statement or USP']
                        },
                        'depth': {'weight': 40, 'criteria': ['Uses a real market example', 'Explains tradeoffs']},
                    },
                    'difficulty_metadata': {
                        'expected_duration_seconds': 120,
                        'follow_up_if_strong': 'How would you reposition a failing product?',
                        'follow_up_if_weak': 'What is a unique selling proposition (USP)?',
                    },
                },
            ],
        })
        self._create_comp(itype, {
            'name': 'SEO & Content',
            'description': 'Search engine optimization and content marketing',
            'weight': 1.2,
            'mastery_keywords': ['SEO', 'keyword research', 'backlinks', 'content strategy'],
            'questions': [
                {
                    'text': 'Explain the key components of a successful SEO strategy.',
                    'difficulty': 'intermediate',
                    'ideal_answer': (
                        'Covers on-page SEO (title tags, meta, headings, keyword density), '
                        'technical SEO (site speed, crawlability, schema), and '
                        'off-page SEO (backlinks, authority, social signals).'
                    ),
                    'rubric': {
                        'technical_accuracy': {
                            'weight': 60,
                            'criteria': ['Explains on-page, off-page, and technical SEO', 'No factually wrong claims']
                        },
                        'depth': {'weight': 40, 'criteria': ['Provides examples of SEO tools or tactics', 'Discusses measurement']},
                    },
                    'difficulty_metadata': {
                        'expected_duration_seconds': 120,
                        'follow_up_if_strong': 'How would you handle a Google algorithm update that dropped traffic?',
                        'follow_up_if_weak': 'What does SEO stand for and why does it matter?',
                    },
                },
            ],
        })

    def _cs_comps(self, itype):
        self._create_comp(itype, {
            'name': 'Object-Oriented Programming',
            'description': 'OOP principles and design patterns',
            'weight': 1.5,
            'mastery_keywords': ['OOP', 'inheritance', 'polymorphism', 'encapsulation', 'abstraction'],
            'questions': [
                {
                    'text': 'Explain the four pillars of Object-Oriented Programming with examples.',
                    'difficulty': 'intermediate',
                    'ideal_answer': (
                        'The four pillars are: (1) Encapsulation — bundling data and methods together '
                        'and restricting direct access. (2) Inheritance — child class inherits properties '
                        'from parent. (3) Polymorphism — same method behaves differently for different objects. '
                        '(4) Abstraction — hiding implementation details and exposing only interface.'
                    ),
                    'rubric': {
                        'technical_accuracy': {
                            'weight': 60,
                            'criteria': [
                                'Correctly defines all 4 pillars',
                                'No technical contradictions',
                                'Distinguishes between inheritance and composition',
                            ]
                        },
                        'depth': {
                            'weight': 40,
                            'criteria': [
                                'Provides code or real-world examples for at least 2 pillars',
                                'Explains why each pillar matters',
                            ]
                        },
                    },
                    'difficulty_metadata': {
                        'expected_duration_seconds': 150,
                        'follow_up_if_strong': 'How do SOLID principles build on top of basic OOP?',
                        'follow_up_if_weak': 'Can you explain polymorphism with a simple real-world analogy?',
                    },
                },
                {
                    'text': 'What is the difference between composition and inheritance? When would you use each?',
                    'difficulty': 'advanced',
                    'ideal_answer': (
                        'Inheritance is an "is-a" relationship (Dog is an Animal). '
                        'Composition is a "has-a" relationship (Car has an Engine). '
                        'Prefer composition for flexibility and to avoid tight coupling. '
                        'Use inheritance for true hierarchical relationships.'
                    ),
                    'rubric': {
                        'technical_accuracy': {
                            'weight': 60,
                            'criteria': ['Correctly describes is-a vs has-a', 'Explains coupling and flexibility']
                        },
                        'depth': {'weight': 40, 'criteria': ['Gives a concrete example of each', 'Discusses tradeoffs']},
                    },
                    'difficulty_metadata': {
                        'expected_duration_seconds': 150,
                        'follow_up_if_strong': 'Can you show how a design pattern uses composition?',
                        'follow_up_if_weak': 'What does tight coupling mean in software?',
                    },
                },
            ],
        })
        self._create_comp(itype, {
            'name': 'Data Structures',
            'description': 'Arrays, linked lists, trees, hash maps',
            'weight': 1.5,
            'mastery_keywords': ['array', 'linked list', 'tree', 'hash map', 'stack', 'queue'],
            'questions': [
                {
                    'text': 'Explain how a hash map works internally. What happens during a collision?',
                    'difficulty': 'intermediate',
                    'ideal_answer': (
                        'A hash map uses a hash function to map keys to bucket indices. '
                        'Collisions occur when two keys hash to the same bucket. '
                        'Resolution strategies: chaining (linked list of entries) or open addressing (linear probing). '
                        'Load factor determines when to resize.'
                    ),
                    'rubric': {
                        'technical_accuracy': {
                            'weight': 60,
                            'criteria': ['Explains hash function and bucket storage', 'Correctly describes collision resolution']
                        },
                        'depth': {'weight': 40, 'criteria': ['Mentions load factor or time complexity', 'Describes at least one resolution strategy in detail']},
                    },
                    'difficulty_metadata': {
                        'expected_duration_seconds': 120,
                        'follow_up_if_strong': 'What is the time complexity of a hash map lookup in the worst case?',
                        'follow_up_if_weak': 'What is a hash function?',
                    },
                },
            ],
        })

    def _ba_comps(self, itype):
        self._create_comp(itype, {
            'name': 'Data Analysis',
            'description': 'Statistical analysis and data interpretation',
            'weight': 1.5,
            'mastery_keywords': ['statistics', 'regression', 'correlation', 'visualization', 'hypothesis'],
            'questions': [
                {
                    'text': 'Explain the difference between correlation and causation with a business example.',
                    'difficulty': 'beginner',
                    'ideal_answer': (
                        'Correlation means two variables move together but one does not necessarily cause the other. '
                        'Causation means one variable directly causes changes in another. '
                        'Example: Ice cream sales and drowning rates are correlated (both rise in summer) '
                        'but ice cream does not cause drowning — the confounder is hot weather. '
                        'To establish causation, use controlled experiments or A/B testing.'
                    ),
                    'rubric': {
                        'technical_accuracy': {
                            'weight': 60,
                            'criteria': [
                                'Correctly distinguishes correlation from causation',
                                'No logical contradictions in definitions',
                                'Mentions the need for controlled experiments to prove causation',
                            ]
                        },
                        'depth': {
                            'weight': 40,
                            'criteria': [
                                'Provides a clear, relatable business or real-world example',
                                'Mentions confounding variables or experimental design',
                            ]
                        },
                    },
                    'difficulty_metadata': {
                        'expected_duration_seconds': 90,
                        'follow_up_if_strong': 'How would you design an experiment to prove causation in a marketing context?',
                        'follow_up_if_weak': 'Can you give me any example of two things that happen at the same time but are not related?',
                    },
                },
                {
                    'text': 'How would you approach analyzing a dataset to find actionable business insights?',
                    'difficulty': 'intermediate',
                    'ideal_answer': (
                        'Steps: (1) Define the business question. (2) Clean the data — handle nulls, outliers, '
                        'duplicates. (3) Exploratory Data Analysis — distributions, correlations, trends. '
                        '(4) Apply statistical tests or models. (5) Visualize findings. '
                        '(6) Translate to actionable recommendations.'
                    ),
                    'rubric': {
                        'technical_accuracy': {
                            'weight': 60,
                            'criteria': ['Mentions data cleaning', 'Describes EDA or statistical analysis', 'Ends with business recommendation']
                        },
                        'depth': {'weight': 40, 'criteria': ['Mentions specific tools (Python, SQL, Tableau)', 'Discusses statistical significance']},
                    },
                    'difficulty_metadata': {
                        'expected_duration_seconds': 150,
                        'follow_up_if_strong': 'How do you handle missing data in a dataset?',
                        'follow_up_if_weak': 'What is exploratory data analysis?',
                    },
                },
            ],
        })
        self._create_comp(itype, {
            'name': 'SQL & Databases',
            'description': 'Database querying and data manipulation',
            'weight': 1.2,
            'mastery_keywords': ['SQL', 'JOIN', 'aggregation', 'subquery', 'indexing'],
            'questions': [
                {
                    'text': 'Explain the different types of SQL JOINs with examples.',
                    'difficulty': 'intermediate',
                    'ideal_answer': (
                        'INNER JOIN: returns rows matching in both tables. '
                        'LEFT JOIN: all rows from left table + matching from right (NULLs if no match). '
                        'RIGHT JOIN: all rows from right table. '
                        'FULL OUTER JOIN: all rows from both tables. '
                        'CROSS JOIN: cartesian product.'
                    ),
                    'rubric': {
                        'technical_accuracy': {
                            'weight': 60,
                            'criteria': ['Correctly defines INNER, LEFT, RIGHT JOINs', 'No wrong SQL descriptions']
                        },
                        'depth': {'weight': 40, 'criteria': ['Provides use-case examples', 'Mentions at least 3 JOIN types']},
                    },
                    'difficulty_metadata': {
                        'expected_duration_seconds': 120,
                        'follow_up_if_strong': 'When would you use a subquery instead of a JOIN?',
                        'follow_up_if_weak': 'What does JOIN do in SQL?',
                    },
                },
            ],
        })

    def _comm_comps(self, itype):
        self._create_comp(itype, {
            'name': 'Verbal Communication',
            'description': 'Clear and effective verbal expression',
            'weight': 1.3,
            'mastery_keywords': ['clarity', 'articulation', 'active listening', 'presentation'],
            'questions': [
                {
                    'text': 'Tell me about a time you had to explain a complex idea to a non-technical audience.',
                    'difficulty': 'intermediate',
                    'ideal_answer': (
                        'Should use the STAR method: Situation — what was the complex idea and who was the audience. '
                        'Task — why it needed to be explained clearly. '
                        'Action — how they simplified it (analogies, visuals, chunking). '
                        'Result — the outcome and whether the audience understood.'
                    ),
                    'rubric': {
                        'technical_accuracy': {
                            'weight': 60,
                            'criteria': ['Uses a real situation (not hypothetical)', 'Describes actual simplification techniques used']
                        },
                        'depth': {'weight': 40, 'criteria': ['Mentions the outcome or impact', 'Shows audience awareness']},
                    },
                    'difficulty_metadata': {
                        'expected_duration_seconds': 120,
                        'follow_up_if_strong': 'What would you do differently if the audience still did not understand?',
                        'follow_up_if_weak': 'What does it mean to adapt your communication style?',
                    },
                },
            ],
        })
        self._create_comp(itype, {
            'name': 'Teamwork',
            'description': 'Collaboration and team dynamics',
            'weight': 1.2,
            'mastery_keywords': ['collaboration', 'conflict resolution', 'delegation', 'empathy'],
            'questions': [
                {
                    'text': 'Describe a situation where you had a disagreement with a team member. How did you resolve it?',
                    'difficulty': 'intermediate',
                    'ideal_answer': (
                        'Should describe a real conflict, their approach to resolving it professionally, '
                        'how they listened and considered the other perspective, '
                        'and what the outcome was for both the relationship and the project.'
                    ),
                    'rubric': {
                        'technical_accuracy': {
                            'weight': 60,
                            'criteria': ['Describes a real specific conflict (not vague)', 'Shows mature resolution approach']
                        },
                        'depth': {'weight': 40, 'criteria': ['Mentions empathy or perspective-taking', 'Describes actual outcome']},
                    },
                    'difficulty_metadata': {
                        'expected_duration_seconds': 120,
                        'follow_up_if_strong': 'What would you do if the conflict was with your manager instead?',
                        'follow_up_if_weak': 'Why is it important to resolve team conflicts professionally?',
                    },
                },
            ],
        })

    # ── Helpers ──────────────────────────────────────────────────

    def _create_comp(self, interview_type, data):
        comp, created = Competency.objects.get_or_create(
            interview_type=interview_type,
            name=data['name'],
            defaults={
                'description': data['description'],
                'weight': data['weight'],
                'mastery_keywords': data['mastery_keywords'],
            }
        )
        if created:
            self.stdout.write(f'  Competency: {comp.name}')

        for q_data in data.get('questions', []):
            q, q_created = Question.objects.get_or_create(
                competency=comp,
                text=q_data['text'],
                defaults={
                    'question_type': 'interview',
                    'difficulty_level': q_data['difficulty'],
                    'ideal_answer': q_data.get('ideal_answer', ''),
                    'evaluation_rubric': q_data.get('rubric', {}),
                    'difficulty_metadata': q_data.get('difficulty_metadata', {}),
                    'source': 'internal_seed',
                }
            )
            if q_created:
                self.stdout.write(f'    Q: {q.text[:60]}...')

    def _seed_roadmap(self, domain, name, duration, hours):
        weeks = int(duration.split('_')[0])
        milestones = [
            {
                'week': w,
                'title': f'Week {w}: Focus Area',
                'competencies': [],
                'resources': [],
                'assignments': [],
                'estimated_hours': round(hours / weeks, 1),
            }
            for w in range(1, weeks + 1)
        ]
        RoadmapTemplate.objects.get_or_create(
            domain=domain, name=name,
            defaults={
                'duration': duration,
                'difficulty_level': 'intermediate',
                'milestones_structure': milestones,
                'total_hours': hours,
                'description': f'{name} — structured learning path',
            }
        )
        self.stdout.write(f'  Roadmap: {name}')
