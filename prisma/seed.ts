/**
 * LawLink 初始 seed
 *
 * 包含：
 *   1. 默认 ADMIN 账号（从 SEED_ADMIN_* 环境变量读取）
 *   2. 案由库样本：民事 / 刑事 / 行政 各约 30 条最常用案由
 *      （V1 用样本即可工作；完整案由库 Stage 3 通过元典 MCP 抓取）
 *   3. 阶段模板、系统设置、文书模板和用章配置
 *
 * 运行方式：
 *   npx prisma db seed
 *
 * 幂等：所有 upsert 操作，可重复运行不会报错或重复插入。
 */

import { MatterCategory, PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { civilCauses } from "./seeds/causes-civil";
import { criminalCauses } from "./seeds/causes-criminal";
import { administrativeCauses } from "./seeds/causes-administrative";
import PizZip from "pizzip";

const prisma = new PrismaClient();

// v0.8 Built-in Templates (inline to avoid build dependency)
const FIRM = {
  name: "LawLink 律师事务所",
  address: "北京市朝阳区建国门外大街1号",
  phone: "010-12345678",
  licenseNo: "京司律证字第12345678号"
};

interface TemplateDef {
  name: string;
  category: "INTAKE" | "RETAINER" | "LITIGATION" | "HEARING" | "WORK_PRODUCT" | "ARCHIVE" | "CLOSING" | "BLANK";
  description: string;
  applicableCategories: MatterCategory[];
  variables: string[];
}

const BUILTIN_TEMPLATE_DEFS: TemplateDef[] = [
  {
    name: "收案登记表",
    category: "INTAKE",
    description: "收案时登记基本信息、委托方信息、案由等。",
    applicableCategories: [],
    variables: ["matter.internalCode", "matter.title", "client.name", "client.idNumber", "client.phone", "client.address", "cause.name", "intake.receivedAt", "intake.description", "lawyer.name", "intake.note", "generatedAt"]
  },
  {
    name: "委托代理合同",
    category: "RETAINER",
    description: "标准委托代理合同，含费用、付款节点、权利义务。",
    applicableCategories: [],
    variables: ["firm.name", "firm.address", "firm.phone", "firm.licenseNo", "client.name", "client.idNumber", "client.address", "matter.title", "matter.category", "fee.amount", "fee.type", "fee.schedule", "lawyer.name", "generatedAt"]
  },
  {
    name: "民事起诉状",
    category: "LITIGATION",
    description: "民事诉讼起诉状标准模板。",
    applicableCategories: ["CIVIL_COMMERCIAL", "CRIMINAL", "ADMINISTRATIVE"],
    variables: ["firm.name", "client.name", "client.idNumber", "client.address", "parties.defendants[0].name", "parties.defendants[0].idNumber", "parties.defendants[0].address", "matter.cause.name", "matter.claimAmount", "court.name", "generatedAt"]
  },
  {
    name: "谈话笔录",
    category: "HEARING",
    description: "与当事人或证人的谈话记录。",
    applicableCategories: [],
    variables: ["matter.internalCode", "lawyer.name", "client.name", "client.idNumber", "interviewee.name", "interviewee.relationship", "interviewee.phone", "interview.date", "interview.content", "generatedAt"]
  },
  {
    name: "法律意见书",
    category: "WORK_PRODUCT",
    description: "针对具体法律问题的专业意见。",
    applicableCategories: [],
    variables: ["firm.name", "firm.address", "firm.phone", "client.name", "matter.title", "matter.cause.name", "lawyer.name", "opinion.date", "opinion.background", "opinion.analysis", "opinion.conclusion", "generatedAt"]
  },
  {
    name: "卷宗目录",
    category: "ARCHIVE",
    description: "归档卷宗的文件目录。",
    applicableCategories: [],
    variables: ["matter.internalCode", "matter.title", "client.name", "matter.category", "archive.date", "folder.name", "documents[].name", "documents[].date", "generatedAt"]
  },
  {
    name: "结案登记表",
    category: "CLOSING",
    description: "案件结案时填写，含办案小结。",
    applicableCategories: [],
    variables: ["matter.internalCode", "matter.title", "client.name", "matter.category", "lawyer.name", "matter.closedAt", "closure.reason", "closure.summary", "generatedAt"]
  },
  {
    name: "风险告知书",
    category: "BLANK",
    description: "向客户告知法律服务的潜在风险。",
    applicableCategories: [],
    variables: ["client.name", "client.idNumber", "matter.category", "matter.cause.name", "risk.items[].description", "risk.items[].level", "generatedAt"]
  }
];

function createDocxBuffer(title: string, body: string, variables: string[]): Buffer {
  const zip = new PizZip();
  const mergeFields = variables.map(v =>
    `<w:fldChar w:fldCharType="begin"/><w:r><w:instrText xml:space="preserve"> MERGEFIELD ${v} \\* MERGEFORMAT </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/><w:r><w:t>{{{${v}}}}</w:t></w:r>`
  ).join("");

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:rPr><w:rFonts w:hint="default"/></w:rPr><w:t>${title}</w:t></w:r></w:p>
    <w:p><w:r><w:t>${body}</w:t></w:r></w:p>
    ${mergeFields}
    <w:p><w:r><w:t>生成时间：{{generatedAt}}</w:t></w:r></w:p>
    <w:sectPr><w:pgSz w:w="11906" w:h="16840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;

  zip.file("word/document.xml", documentXml);
  zip.file("[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.file("_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file("word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);

  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}

async function seedV08Templates(prisma: PrismaClient) {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  if (!admin) {
    console.log("⚠ 跳过 v0.8 模板 seed：未发现 ADMIN 用户");
    return;
  }

  // Need storage to write files - use local storage directly
  const { writeFile } = await import("./../src/lib/storage/local");
  const { encryptBuffer, sha256 } = await import("./../src/lib/storage/crypto");

  let created = 0;
  let skipped = 0;

  // Create a sample matter for default folders if none exists
  let sampleMatter = await prisma.matter.findFirst({ select: { id: true } });
  if (!sampleMatter) {
    // Create a minimal intake first
    const client = await prisma.client.findFirst({ select: { id: true } });
    if (!client) {
      // Create a demo client
      const demoClient = await prisma.client.create({
        data: {
          name: "演示客户",
          type: "COMPANY",
          internalCode: "KH-2026-DEMO001"
        }
      });
    }

    const clientForIntake = await prisma.client.findFirst({ select: { id: true } });
    const intake = await prisma.intake.create({
      data: {
        title: "演示收案",
        category: "CIVIL_COMMERCIAL",
        status: "CONVERTED",
        clientId: clientForIntake!.id,
        receivedAt: new Date(),
        ownerUserId: admin.id!,
        createdById: admin.id!
      }
    });

    sampleMatter = await prisma.matter.create({
      data: {
        internalCode: "LL-2026-TEMP-0001",
        title: "模板演示案件",
        category: "CIVIL_COMMERCIAL",
        status: "IN_PROGRESS",
        ownerId: admin.id!,
        intakeId: intake.id,
        intakeDate: new Date()
      }
    });
    console.log(`  ℹ 创建演示案件用于挂载默认卷宗: ${sampleMatter.id}`);
  }

  // Seed default folders for this matter
  const folderDefs = [
    { name: "收案", order: 0, isDefault: true },
    { name: "立案", order: 1, isDefault: true },
    { name: "委托手续", order: 2, isDefault: true },
    { name: "证据", order: 3, isDefault: true },
    { name: "程序文书", order: 4, isDefault: true },
    { name: "庭审", order: 5, isDefault: true },
    { name: "裁判", order: 6, isDefault: true },
    { name: "结案", order: 7, isDefault: true }
  ];

  for (const folder of folderDefs) {
    await prisma.documentFolder.upsert({
      where: { matterId_name: { matterId: sampleMatter.id, name: folder.name } },
      update: {},
      create: {
        matterId: sampleMatter.id,
        name: folder.name,
        orderIndex: folder.order,
        isDefault: folder.isDefault
      }
    });
  }
  console.log(`  ✓ 默认卷宗：${folderDefs.length} 个已就绪（案件 ${sampleMatter.id}）`);

  // Seed templates
  for (const tmpl of BUILTIN_TEMPLATE_DEFS) {
    const existing = await prisma.documentTemplate.findFirst({
      where: { name: tmpl.name, isBuiltIn: true },
      select: { id: true }
    });
    if (existing) {
      skipped++;
      continue;
    }

    const body = getTemplateBody(tmpl.name, tmpl.category);
    const buf = createDocxBuffer(tmpl.name, body, tmpl.variables);

    const enc = encryptBuffer(buf);
    const filePath = await writeFile("templates", enc.ciphertext);

    const doc = await prisma.document.create({
      data: {
        name: `${tmpl.name}.docx`,
        category: "OTHER",
        path: filePath,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: buf.length,
        sha256: sha256(buf),
        encrypted: true,
        algorithm: enc.algorithm,
        iv: enc.iv.toString("base64"),
        authTag: enc.authTag.toString("base64"),
        tags: ["内置模板"],
        uploadedById: admin.id
      }
    });

    await prisma.documentTemplate.create({
      data: {
        name: tmpl.name,
        category: tmpl.category,
        description: tmpl.description,
        applicableCategories: tmpl.applicableCategories,
        docxBlobId: doc.id,
        variables: tmpl.variables,
        isBuiltIn: true,
        enabled: true,
        createdById: admin.id
      }
    });
    created++;
  }
  console.log(`✓ v0.8 模板：${created} 个新建 / ${skipped} 个已存在`);
}

function getTemplateBody(name: string, category: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  switch (name) {
    case "收案登记表":
      return `${FIRM.name}
收案登记表

案件编号：{{{matter.internalCode}}}
收案日期：{{{intake.receivedAt}}}

一、委托方信息
姓名/名称：{{{client.name}}}
证件号码：{{{client.idNumber}}}
联系电话：{{{client.phone}}}
联系地址：{{{client.address}}}

二、案件信息
案由：{{{cause.name}}}
简要描述：{{{intake.description}}}

三、接待律师
{{{lawyer.name}}}

四、备注
{{{intake.note}}}

本登记表仅作内部备案使用。`;

    case "委托代理合同":
      return `${FIRM.name}
委托代理合同

甲方（委托人）：{{{client.name}}}
身份证号/统一社会信用代码：{{{client.idNumber}}}
联系地址：{{{client.address}}}

乙方（受托人）：${FIRM.name}
统一社会信用代码：${FIRM.licenseNo}
联系地址：${FIRM.address}
联系电话：${FIRM.phone}

第一条 委托事项
甲方因{{{matter.title}}}一案，委托乙方提供法律服务。

第二条 服务范围
乙方指派 {{{lawyer.name}}} 律师担任本案的主办律师。

第三条 律师服务费
1. 计费方式：{{{fee.type}}}
2. 费用金额：人民币{{{fee.amount}}}元
3. 付款节点：{{{fee.schedule}}}

第四条 双方权利义务
（详见合同标准条款）

第五条 合同生效
本合同一式两份，甲乙双方各执一份，自双方签字盖章之日起生效。

甲方（签字/盖章）：___________
日期：___________

乙方（盖章）：${FIRM.name}
日期：___________
`;

    case "民事起诉状":
      return `${FIRM.name}
民事起诉状

原告：{{{client.name}}}
身份证号：{{{client.idNumber}}}
住址：{{{client.address}}}

被告：{{{parties.defendants[0].name}}}
身份证号/统一社会信用代码：{{{parties.defendants[0].idNumber}}}
住址：{{{parties.defendants[0].address}}}

诉讼请求
1. 判令被告支付 {{{matter.claimAmount}}} 元；
2. 本案诉讼费用由被告承担。

事实与理由
原告与被告因{{{matter.cause.name}}}纠纷，被告未能履行合同义务，严重损害原告合法权益。
根据《中华人民共和国民法典》等相关法律规定，原告特向贵院提起诉讼，请求依法判决。

此致
{{{court.name}}}

具状人（原告）：{{{client.name}}}
${year}年${month}月${day}日
附：证据清单
`;

    case "谈话笔录":
      return `${FIRM.name}
谈话笔录

案件编号：{{{matter.internalCode}}}
会见律师：{{{lawyer.name}}}

时间：{{{interview.date}}}
地点：${FIRM.address}
记录人：{{{lawyer.name}}}

被谈话人：{{{interviewee.name}}}
与当事人关系：{{{interviewee.relationship}}}
联系电话：{{{interviewee.phone}}}

谈话内容：
{{{interview.content}}}

谈话人（签字）：___________
被谈话人（签字）：___________
日期：{{{interview.date}}}
`;

    case "法律意见书":
      return `${FIRM.name}
法律意见书

致：{{{client.name}}}

发件人：${FIRM.name}
地址：${FIRM.address}
电话：${FIRM.phone}  
日期：{{{opinion.date}}}

事由：关于{{{matter.title}}}的法律意见

一、基本事实
{{{opinion.background}}}

二、法律分析
{{{opinion.analysis}}}

三、结论与建议
{{{opinion.conclusion}}}

承办律师：{{{lawyer.name}}}

${FIRM.name}（盖章）
${year}年${month}月${day}日
`;

    case "卷宗目录":
      return `${FIRM.name}
卷宗目录

案件编号：{{{matter.internalCode}}}
案件名称：{{{matter.title}}}
委托人：{{{client.name}}}
案件类别：{{{matter.category}}}
归档日期：{{{archive.date}}}

卷宗名称：{{{folder.name}}}

序号\t文件名称\t日期\t备注
{{#documents}}
{{@index + 1}}\t{{{name}}}\t{{{date}}}\t
{{/documents}}

保管人：___________
检查人：___________
归档日期：{{{archive.date}}}
`;

    case "结案登记表":
      return `${FIRM.name}
结案登记表

一、案件基本信息
案件编号：{{{matter.internalCode}}}
案件名称：{{{matter.title}}}
委托人：{{{client.name}}}
案件类别：{{{matter.category}}}
主办律师：{{{lawyer.name}}}

二、结案情况
结案日期：{{{matter.closedAt}}}
结案原因：{{{closure.reason}}}

三、办案小结
{{{closure.summary}}}

四、归档情况
□ 材料完整
□ 材料缺失（详见备注）

归档人：___________
归档日期：{{{matter.closedAt}}}

备注：_______________
`;

    case "风险告知书":
      return `${FIRM.name}
法律服务风险告知书

致：{{{client.name}}}

根据《律师法》及相关规定，本所现就{{{matter.category}}}案件（案由：{{{matter.cause.name}}}）相关风险告知如下：

一、诉讼风险
1. 证据不足风险：案件可能因证据不足而败诉。
2. 法律适用风险：案件结果可能因法律法规变化而受到影响。
3. 执行风险：即使胜诉，对方可能无财产可供执行。

二、收费方式
本次法律服务采用风险代理方式，具体详见委托代理合同。

三、其他告知
1. 律师承诺勤勉尽责，但不承诺案件必然胜诉。
2. 委托人应如实提供案件材料，配合律师工作。
3. 案件进程可能因客观原因延长。

我已阅读并理解上述风险告知内容。

委托人（签字）：___________
日期：___________

律师事务所（盖章）：
${FIRM.name}
`;

    default:
      return `${FIRM.name}\n\n${name}\n\n{{{generatedAt}}}`;
  }
}

type CauseSeed = {
  code: string;
  name: string;
  shortName?: string;
  level: number;
  parentCode?: string;
  keywords?: string[];
};

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@lawlink.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!2026";
  const name = process.env.SEED_ADMIN_NAME ?? "系统管理员";

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      role: UserRole.ADMIN,
      passwordHash,
      active: true
    }
  });

  console.log(`✓ ADMIN 已就绪：${admin.email}`);
  if (password === "ChangeMe!2026") {
    console.warn("  ⚠ 当前使用默认密码 ChangeMe!2026，请尽快在 /settings 修改");
  }
}

async function seedCauses(category: MatterCategory, causes: CauseSeed[]) {
  // 第一遍：插入所有节点（parentId 暂空），记录 code → id 映射
  const codeToId = new Map<string, string>();
  const sourceNote =
    category === MatterCategory.CIVIL_COMMERCIAL
      ? "最高法《民事案件案由规定》2020 修正（样本）"
      : category === MatterCategory.CRIMINAL
        ? "刑法分则罪名（样本）"
        : "最高法《行政案件案由暂行规定》2021（样本）";

  for (const c of causes) {
    const upserted = await prisma.causeOfAction.upsert({
      where: { category_code: { category, code: c.code } },
      update: {
        name: c.name,
        shortName: c.shortName,
        level: c.level,
        keywords: c.keywords ?? [],
        sourceNote
      },
      create: {
        category,
        code: c.code,
        name: c.name,
        shortName: c.shortName,
        level: c.level,
        keywords: c.keywords ?? [],
        sourceNote
      }
    });
    codeToId.set(c.code, upserted.id);
  }

  // 第二遍：连接 parent
  for (const c of causes) {
    if (!c.parentCode) continue;
    const parentId = codeToId.get(c.parentCode);
    if (!parentId) {
      console.warn(`  ! ${c.code} 的 parent ${c.parentCode} 未找到，跳过`);
      continue;
    }
    await prisma.causeOfAction.update({
      where: { category_code: { category, code: c.code } },
      data: { parentId }
    });
  }

  console.log(`✓ 案由 [${category}]：${causes.length} 条已就绪`);
}

async function seedStageTemplates() {
  // 第一版只放最常用的一审/二审/侦查/审查起诉默认模板
  // 编辑入口在 /settings/templates
  const templates = [
    {
      procedureType: "FIRST_INSTANCE" as const,
      name: "一审标准阶段",
      steps: [
        { name: "立案", order: 1, defaultTasks: ["提交起诉状", "缴纳诉讼费"] },
        { name: "应诉", order: 2, defaultTasks: ["确认收到应诉通知"] },
        { name: "证据交换", order: 3, defaultTasks: ["提交证据目录", "举证期限内补充证据"] },
        { name: "开庭", order: 4, defaultTasks: ["庭前会议", "正式开庭"] },
        { name: "判决", order: 5, defaultTasks: ["收到判决书", "确认是否上诉"] }
      ]
    },
    {
      procedureType: "SECOND_INSTANCE" as const,
      name: "二审标准阶段",
      steps: [
        { name: "立案", order: 1, defaultTasks: ["提交上诉状"] },
        { name: "答辩", order: 2, defaultTasks: ["收到对方上诉状", "提交答辩状"] },
        { name: "开庭/询问", order: 3, defaultTasks: ["开庭或书面审理"] },
        { name: "判决", order: 4, defaultTasks: ["收到二审判决书"] }
      ]
    },
    {
      procedureType: "INVESTIGATION" as const,
      name: "侦查阶段标准流程",
      steps: [
        { name: "会见", order: 1, defaultTasks: ["首次会见", "持续会见"] },
        { name: "强制措施", order: 2, defaultTasks: ["申请取保候审", "羁押必要性审查"] },
        { name: "侦查终结", order: 3, defaultTasks: ["提出辩护意见"] }
      ]
    },
    {
      procedureType: "PROSECUTION_REVIEW" as const,
      name: "审查起诉阶段标准流程",
      steps: [
        { name: "阅卷", order: 1, defaultTasks: ["阅卷", "复制证据"] },
        { name: "辩护意见", order: 2, defaultTasks: ["提交不起诉/罪轻辩护意见"] },
        { name: "认罪认罚", order: 3, defaultTasks: ["签署具结书（如认罪）"] }
      ]
    }
  ];

  for (const t of templates) {
    await prisma.stageTemplate.upsert({
      where: { id: `default-${t.procedureType}` },
      update: { steps: t.steps as unknown as object, name: t.name },
      create: {
        id: `default-${t.procedureType}`,
        procedureType: t.procedureType,
        name: t.name,
        isDefault: true,
        steps: t.steps as unknown as object
      }
    });
  }
  console.log(`✓ 阶段模板：${templates.length} 个已就绪`);
}

async function seedSystemSettings() {
  await prisma.systemSetting.upsert({
    where: { key: "appearance" },
    update: {},
    create: {
      key: "appearance",
      value: { primaryColor: "#5B8DEF", theme: "dark" }
    }
  });
  console.log("✓ 系统设置：默认外观已就绪");
}

// NEW: Seed Genealogy data (Persons, Relationships, Events, Lineage)
async function seedGenealogy() {
  // Get admin user
  const admin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
    select: { id: true }
  });
  if (!admin) throw new Error("Admin user not found");

  // Create sample persons
  const person1 = await prisma.person.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      fullName: "Nguyễn Văn A",
      gender: "MALE",
      birthYear: 1950,
      generation: 1,
      note: "Ông nội"
    }
  });
  const person2 = await prisma.person.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      fullName: "Trần Thị B",
      gender: "FEMALE",
      birthYear: 1955,
      birthMonth: 3,
      birthDay: 10,
      generation: 1,
      note: "Bà nội"
    }
  });
  const person3 = await prisma.person.upsert({
    where: { id: "00000000-0000-0000-0000-000000000003" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000003",
      fullName: "Nguyễn Văn C",
      gender: "MALE",
      birthYear: 1975,
      generation: 2,
      fatherId: person1.id,
      motherId: person2.id,
      note: "Con trai trưởng"
    }
  });
  const person4 = await prisma.person.upsert({
    where: { id: "00000000-0000-0000-0000-000000000004" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000004",
      fullName: "Lê Thị D",
      gender: "FEMALE",
      birthYear: 1980,
      generation: 2,
      note: "Con dâu"
    }
  });

  // Relationships
  await prisma.relationship.upsert({
    where: { id: "rel-1" },
    update: {},
    create: {
      id: "rel-1",
      fromPersonId: person1.id,
      toPersonId: person2.id,
      type: "SPOUSE"
    }
  });
  await prisma.relationship.upsert({
    where: { id: "rel-2" },
    update: {},
    create: {
      id: "rel-2",
      fromPersonId: person3.id,
      toPersonId: person4.id,
      type: "SPOUSE"
    }
  });

  // Events
  await prisma.event.createMany({
    data: [
      {
        personId: person1.id,
        type: "BIRTH",
        name: "Sinh ra",
        eventDate: new Date(1950, 0, 15),
        location: "Hà Nội"
      },
      {
        personId: person3.id,
        type: "BIRTH",
        name: "Sinh ra",
        eventDate: new Date(1975, 5, 20),
        location: "HCM"
      },
      {
        personId: person1.id,
        type: "DEATH",
        name: "Mất",
        eventDate: new Date(2020, 10, 5),
        location: "HCM"
      }
    ]
  });

  // Lineage (calculate simple for person3 with root=person1) - use upsert to avoid duplicate
  await prisma.lineage.upsert({
    where: {
      personId_rootPersonId: {
        personId: person3.id,
        rootPersonId: person1.id
      }
    },
    update: {},
    create: {
      personId: person3.id,
      rootPersonId: person1.id,
      generation: 2,
      path: JSON.stringify([person1.id])
    }
  });

  console.log("✓ Genealogy seed: persons, relationships, events, lineage");
}

// NEW: Seed ERP data (Projects, WorkTasks, Workflows)
async function seedERP(adminId?: string) {
  const userId = adminId ?? (await prisma.user.findFirst({ where: { role: UserRole.ADMIN } }))?.id;
  if (!userId) throw new Error("Admin user not found for ERP seed");

  // Project
  const project = await prisma.project.upsert({
    where: { id: "00000000-0000-0000-0000-000000000901" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000901",
      name: "Demo Project",
      description: "Seed project for ERP",
      status: "ACTIVE",
      ownerId: userId,
      startDate: new Date()
    }
  });

  // WorkTask
  const task1 = await prisma.workTask.upsert({
    where: { id: "00000000-0000-0000-0000-000000000911" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000911",
      title: "Welcome task",
      description: "Get started with ERP",
      status: "TODO",
      priority: "MEDIUM",
      projectId: project.id,
      assigneeId: userId
    }
  });

  const task2 = await prisma.workTask.upsert({
    where: { id: "00000000-0000-0000-0000-000000000912" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000912",
      title: "Review project plan",
      description: "Check milestones",
      status: "IN_PROGRESS",
      priority: "HIGH",
      projectId: project.id,
      assigneeId: userId
    }
  });

  // Workflow
  const workflow = await prisma.workflow.upsert({
    where: { id: "00000000-0000-0000-0000-000000000921" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000921",
      name: "Simple Review Workflow",
      status: "ACTIVE",
      projectId: project.id,
      ownerId: userId
    }
  });

  console.log("✓ ERP seed: project, tasks, workflow");
}

async function seedV08SealConfigs(prisma: PrismaClient) {
  const configs = [
    {
      type: "OFFICIAL_SEAL" as const,
      label: "律师事务所公章",
      description: "用于法律意见书、所函、律师函、对外正式文件等。",
      approverRoles: ["PRINCIPAL_LAWYER" as const],
      requiresLegalRep: false
    },
    {
      type: "CONTRACT_SEAL" as const,
      label: "合同专用章",
      description: "律所对外签订的合同（顾问、转介等）。",
      approverRoles: ["PRINCIPAL_LAWYER" as const],
      requiresLegalRep: false
    },
    {
      type: "FINANCE_SEAL" as const,
      label: "财务专用章",
      description: "发票、收据、对账单等财务文件。",
      approverRoles: ["FINANCE" as const],
      requiresLegalRep: false
    },
    {
      type: "LEGAL_REP_SEAL" as const,
      label: "法定代表人章",
      description: "工商登记、银行类文件。仅法定代表人本人可审批。",
      approverRoles: [],
      requiresLegalRep: true
    },
    {
      type: "CONTRACT_REVIEW_SEAL" as const,
      label: "合同审核章",
      description: "顾问单位送审合同盖审核章。",
      approverRoles: ["PRINCIPAL_LAWYER" as const],
      requiresLegalRep: false
    }
  ];

  for (const c of configs) {
    await prisma.sealTypeConfig.upsert({
      where: { type: c.type },
      update: {
        label: c.label,
        description: c.description,
        approverRoles: c.approverRoles,
        requiresLegalRep: c.requiresLegalRep
      },
      create: c
    });
  }
  console.log(`✓ v0.8 用章配置：${configs.length} 种已就绪`);
}

async function main() {
  console.log("开始 seed...\n");

  await seedAdmin();
  await seedCauses(MatterCategory.CIVIL_COMMERCIAL, civilCauses);
  await seedCauses(MatterCategory.CRIMINAL, criminalCauses);
  await seedCauses(MatterCategory.ADMINISTRATIVE, administrativeCauses);
  await seedStageTemplates();
  await seedSystemSettings();

  // v0.8: 文档模板 + 用章配置 (now inline)
  await seedV08SealConfigs(prisma);
  await seedV08Templates(prisma);

  // NEW: Genealogy seed
  await seedGenealogy();

  // NEW: ERP seed
  await seedERP();

  console.log("\n✓ Seed 完成");
}

main()
  .catch((e) => {
    console.error("✗ Seed 失败：", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
